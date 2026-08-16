import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category'); // optional filter

  // Get all FINISHED participants
  let query = supabase
    .from('participants')
    .select('*')
    .eq('status', 'FINISHED');

  if (category && category !== 'ALL') query = query.eq('category', category);

  const { data: finishers, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!finishers || finishers.length === 0) return NextResponse.json([]);

  // Get the FINISH checkpoint
  const { data: finishCheckpoint } = await supabase
    .from('checkpoints')
    .select('id')
    .eq('checkpoint_code', 'FINISH')
    .single();

  // Get the first-ever VALID scan for FINISH for each participant
  const participantIds = finishers.map((p: any) => p.id);
  const { data: finishScans } = await supabase
    .from('checkpoint_scans')
    .select('participant_id, scanned_at')
    .in('participant_id', participantIds)
    .eq('checkpoint_id', finishCheckpoint?.id ?? '')
    .eq('status', 'VALID')
    .order('scanned_at', { ascending: true });

  // Build map: participant_id -> finish scanned_at
  const finishTimeMap = new Map<string, string>();
  for (const scan of finishScans ?? []) {
    if (!finishTimeMap.has(scan.participant_id)) {
      finishTimeMap.set(scan.participant_id, scan.scanned_at);
    }
  }

  // Get the first VALID scan (the earliest scan overall) per participant as race start proxy
  const { data: firstScans } = await supabase
    .from('checkpoint_scans')
    .select('participant_id, scanned_at')
    .in('participant_id', participantIds)
    .eq('status', 'VALID')
    .order('scanned_at', { ascending: true });

  const startTimeMap = new Map<string, string>();
  for (const scan of firstScans ?? []) {
    if (!startTimeMap.has(scan.participant_id)) {
      startTimeMap.set(scan.participant_id, scan.scanned_at);
    }
  }

  // Build ranking rows
  const rows = finishers
    .map((p: any) => {
      const finishTime = finishTimeMap.get(p.id);
      const startTime = startTimeMap.get(p.id);
      let duration: string | null = null;
      if (finishTime && startTime) {
        const diffMs = new Date(finishTime).getTime() - new Date(startTime).getTime();
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        const s = Math.floor((diffMs % 60000) / 1000);
        duration = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      return {
        participant: p,
        finishTime: finishTime ?? null,
        startTime: startTime ?? null,
        duration,
        durationMs: finishTime && startTime
          ? new Date(finishTime).getTime() - new Date(startTime).getTime()
          : Infinity,
      };
    })
    .sort((a: any, b: any) => a.durationMs - b.durationMs)
    .map((row: any, idx: number) => ({ ...row, rank: idx + 1 }));

  return NextResponse.json(rows);
}
