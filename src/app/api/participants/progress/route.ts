import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  // Fetch all checkpoints
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('active', true)
    .order('sequence');

  // Fetch all participants
  let pQuery = supabase.from('participants').select('*').order('participant_number');
  if (category && category !== 'ALL') pQuery = pQuery.eq('category', category);
  const { data: participants, error } = await pQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch all VALID scans
  const { data: validScans } = await supabase
    .from('checkpoint_scans')
    .select('participant_id, checkpoint_id, scanned_at')
    .eq('status', 'VALID')
    .order('scanned_at', { ascending: true });

  // Build map: participant_id -> { checkpoint_id -> scanned_at }
  const scanMap = new Map<string, Map<string, string>>();
  for (const scan of validScans ?? []) {
    if (!scanMap.has(scan.participant_id)) scanMap.set(scan.participant_id, new Map());
    if (!scanMap.get(scan.participant_id)!.has(scan.checkpoint_id)) {
      scanMap.get(scan.participant_id)!.set(scan.checkpoint_id, scan.scanned_at);
    }
  }

  // Build progress per participant
  const result = (participants ?? []).map((p: any) => {
    const pScans = scanMap.get(p.id) ?? new Map<string, string>();
    const cpProgress = (checkpoints ?? []).reduce((acc: any, cp: any) => {
      acc[cp.checkpoint_code] = pScans.get(cp.id) ?? null;
      return acc;
    }, {} as Record<string, string | null>);

    return {
      ...p,
      checkpoints: cpProgress,
    };
  });

  return NextResponse.json({ participants: result, checkpoints });
}
