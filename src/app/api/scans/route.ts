import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { searchParams } = new URL(request.url);

  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const status = searchParams.get('status'); // VALID | REJECTED | DUPLICATE
  const participantId = searchParams.get('participant_id');

  let query = supabase
    .from('checkpoint_scans')
    .select('*, participant:participants(id, bib_number, name, category), checkpoint:checkpoints(id, name, checkpoint_code, sequence)')
    .order('scanned_at', { ascending: false })
    .limit(limit);

  if (status && status !== 'ALL') query = query.eq('status', status);
  if (participantId) query = query.eq('participant_id', participantId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
