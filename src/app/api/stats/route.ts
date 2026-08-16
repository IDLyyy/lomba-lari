import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createServerSupabaseClient();

  const [
    { count: total },
    { count: running },
    { count: finished },
    { count: disqualified },
    { count: totalScans },
    { count: rejectedScans },
    { data: participants },
    { data: checkpoints },
    { data: validScans },
  ] = await Promise.all([
    supabase.from('participants').select('*', { count: 'exact', head: true }),
    supabase.from('participants').select('*', { count: 'exact', head: true }).eq('status', 'RUNNING'),
    supabase.from('participants').select('*', { count: 'exact', head: true }).eq('status', 'FINISHED'),
    supabase.from('participants').select('*', { count: 'exact', head: true }).eq('status', 'DISQUALIFIED'),
    supabase.from('checkpoint_scans').select('*', { count: 'exact', head: true }),
    supabase.from('checkpoint_scans').select('*', { count: 'exact', head: true }).eq('status', 'REJECTED'),
    supabase.from('participants').select('id, status'),
    supabase.from('checkpoints').select('id, sequence').eq('active', true).order('sequence'),
    supabase.from('checkpoint_scans').select('participant_id, checkpoint_id').eq('status', 'VALID'),
  ]);

  // Calculate "missing checkpoint" — REGISTERED participants who have NOT finished but have been scanned
  // i.e. they are running but have gaps in their checkpoint sequence
  let missing = 0;
  if (participants && checkpoints && validScans) {
    const maxSeq = Math.max(...checkpoints.map((c: any) => c.sequence));
    const scansMap = new Map<string, Set<string>>();
    for (const scan of validScans) {
      if (!scansMap.has(scan.participant_id)) scansMap.set(scan.participant_id, new Set());
      scansMap.get(scan.participant_id)!.add(scan.checkpoint_id);
    }
    const checkpointSeqMap = new Map(checkpoints.map((c: any) => [c.id, c.sequence]));

    for (const p of participants) {
      if (p.status === 'FINISHED' || p.status === 'DISQUALIFIED') continue;
      const scanned = scansMap.get(p.id);
      if (!scanned) continue;
      const completedSeqs = [...scanned].map(cid => checkpointSeqMap.get(cid) ?? 0).filter(Boolean).sort();
      // Check for gaps
      for (let i = 0; i < completedSeqs.length; i++) {
        if (completedSeqs[i] !== i + 1) { missing++; break; }
      }
    }
  }

  return NextResponse.json({
    total: total ?? 0,
    running: running ?? 0,
    finished: finished ?? 0,
    missing,
    disqualified: disqualified ?? 0,
    totalScans: totalScans ?? 0,
    rejectedScans: rejectedScans ?? 0,
  });
}
