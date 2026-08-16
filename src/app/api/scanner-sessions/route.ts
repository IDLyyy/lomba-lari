import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('scanner_sessions')
    .select('*, checkpoint:checkpoints(*)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { checkpoint_id, device_name } = await request.json();

  if (!checkpoint_id || !device_name) {
    return NextResponse.json(
      { error: 'checkpoint_id dan device_name wajib diisi.' },
      { status: 400 }
    );
  }

  // Deactivate previous sessions for the same device name
  await supabase
    .from('scanner_sessions')
    .update({ active: false })
    .eq('device_name', device_name);

  const { data, error } = await supabase
    .from('scanner_sessions')
    .insert({ checkpoint_id, device_name, active: true })
    .select('*, checkpoint:checkpoints(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
