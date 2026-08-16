import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { invalidateCheckpointCache } from '@/services/checkpoint-validator';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .order('sequence', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const { data: existing } = await supabase
    .from('checkpoints')
    .select('id')
    .eq('sequence', body.sequence)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Sequence sudah digunakan oleh checkpoint lain.' }, { status: 409 });
  }

  const { data, error } = await supabase.from('checkpoints').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateCheckpointCache();
  return NextResponse.json(data, { status: 201 });
}
