import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { invalidateCheckpointCache } from '@/services/checkpoint-validator';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const body = await req.json();

  // If changing sequence, check for conflicts
  if (body.sequence !== undefined) {
    const { data: existing } = await supabase
      .from('checkpoints')
      .select('id')
      .eq('sequence', body.sequence)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Sequence sudah digunakan oleh checkpoint lain.' },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from('checkpoints')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateCheckpointCache();
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from('checkpoints').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  invalidateCheckpointCache();
  return NextResponse.json({ success: true });
}
