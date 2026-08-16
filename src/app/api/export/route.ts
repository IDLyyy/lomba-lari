import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  // Fetch all participants
  let pQuery = supabase.from('participants').select('*').order('participant_number');
  if (category && category !== 'ALL') pQuery = pQuery.eq('category', category);
  const { data: participants, error } = await pQuery;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch all valid scans with checkpoint info
  const { data: allScans } = await supabase
    .from('checkpoint_scans')
    .select('participant_id, scanned_at, checkpoint:checkpoints(checkpoint_code, sequence)')
    .eq('status', 'VALID')
    .order('scanned_at', { ascending: true });

  // Fetch checkpoints for column headers
  const { data: checkpoints } = await supabase
    .from('checkpoints')
    .select('checkpoint_code, sequence, name')
    .order('sequence');

  // Build scan map: participant_id -> checkpoint_code -> earliest scanned_at
  const scanMap = new Map<string, Map<string, string>>();
  for (const scan of allScans ?? []) {
    if (!scanMap.has(scan.participant_id)) scanMap.set(scan.participant_id, new Map());
    const cpCode = (scan.checkpoint as any)?.checkpoint_code;
    if (cpCode && !scanMap.get(scan.participant_id)!.has(cpCode)) {
      scanMap.get(scan.participant_id)!.set(cpCode, scan.scanned_at);
    }
  }

  // Build ranking: finished participants sorted by duration
  const finishedRows = (participants ?? [])
    .filter((p: any) => p.status === 'FINISHED')
    .map((p: any) => {
      const pScans = scanMap.get(p.id);
      const finishTime = pScans?.get('FINISH');
      // First CP scan as start
      const times = pScans ? [...pScans.values()].sort() : [];
      const startTime = times[0];
      const durationMs =
        finishTime && startTime
          ? new Date(finishTime).getTime() - new Date(startTime).getTime()
          : Infinity;
      return { p, pScans, finishTime, durationMs };
    })
    .sort((a: any, b: any) => a.durationMs - b.durationMs);

  const rankMap = new Map<string, number>();
  finishedRows.forEach(({ p }: any, idx: number) => rankMap.set(p.id, idx + 1));

  // Build CSV
  const cpCodes = (checkpoints ?? []).filter(c => c.checkpoint_code !== 'FINISH').map((c: any) => c.checkpoint_code);
  const headers = ['Rank', 'Bib', 'Peserta', 'Kategori', ...cpCodes.map((c: string) => `${c} Time`), 'Finish Time', 'Durasi', 'Status'];

  const formatTime = (iso: string | undefined) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleTimeString('id-ID', { hour12: false });
  };

  const formatDuration = (ms: number) => {
    if (!isFinite(ms)) return '-';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const rows = (participants ?? []).map((p: any) => {
    const pScans = scanMap.get(p.id);
    const times = pScans ? [...pScans.values()].sort() : [];
    const startTime = times[0];
    const finishTime = pScans?.get('FINISH');
    const durationMs =
      finishTime && startTime
        ? new Date(finishTime).getTime() - new Date(startTime).getTime()
        : Infinity;

    const rank = rankMap.get(p.id) ?? '-';
    const cpTimes = cpCodes.map((code: string) => formatTime(pScans?.get(code)));

    return [
      rank,
      p.bib_number,
      p.name,
      p.category,
      ...cpTimes,
      formatTime(finishTime),
      formatDuration(durationMs),
      p.status,
    ].map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.map((h: string) => `"${h}"`).join(','), ...rows].join('\r\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="race-results-${Date.now()}.csv"`,
    },
  });
}
