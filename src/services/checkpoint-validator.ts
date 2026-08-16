import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { ScanResult, ScanStatus } from '@/types';

// ── Server-side checkpoint cache ────────────────────────────────────────────
// Checkpoints change rarely (admin adds/removes them, not during a race).
// Cache them in module memory so we skip one DB round-trip per scan.
// TTL: 60 seconds — stale at worst for 60s after an admin edit.
let _cpCache: { data: any[]; ts: number } | null = null;
const CP_CACHE_TTL = 60_000;

async function getCheckpoints(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const now = Date.now();
  if (_cpCache && now - _cpCache.ts < CP_CACHE_TTL) return _cpCache.data;
  const { data } = await supabase
    .from('checkpoints')
    .select('id,sequence,checkpoint_code,name,active')
    .order('sequence');
  _cpCache = { data: data ?? [], ts: now };
  return _cpCache.data;
}

// Call this when admin updates a checkpoint so cache is invalidated immediately
export function invalidateCheckpointCache() { _cpCache = null; }

// ── Main validator ───────────────────────────────────────────────────────────
export async function validateAndRecordScan(
  qrToken: string,
  checkpointId: string,
  scannerSessionId?: string
): Promise<ScanResult> {
  const supabase = createServerSupabaseClient();

  // Round-trip 1 (parallel): participant + target checkpoint + cached checkpoints
  // allCheckpoints comes from cache most of the time → 0 extra DB call
  const [
    { data: participant },
    { data: checkpoint },
    allCheckpoints,
  ] = await Promise.all([
    supabase.from('participants')
      .select('id,bib_number,name,category,qr_token,participant_number,status,created_at')
      .eq('qr_token', qrToken)
      .single(),
    supabase.from('checkpoints')
      .select('id,sequence,checkpoint_code,name,active,location_name,created_at')
      .eq('id', checkpointId)
      .single(),
    getCheckpoints(supabase),
  ]);

  if (!participant) return { success: false, status: 'REJECTED', message: 'Peserta tidak ditemukan.' };
  if (!checkpoint)  return { success: false, status: 'REJECTED', message: 'Checkpoint tidak ditemukan.' };
  if (!checkpoint.active) return { success: false, status: 'REJECTED', message: 'Checkpoint tidak aktif.' };

  // Round-trip 2: participant's existing VALID scans (only checkpoint_id column)
  const { data: validScans } = await supabase
    .from('checkpoint_scans')
    .select('checkpoint_id')
    .eq('participant_id', participant.id)
    .eq('status', 'VALID');

  const completedCpIds = new Set((validScans ?? []).map((s: any) => s.checkpoint_id));

  // ── Duplicate ──────────────────────────────────────────────────────────────
  if (completedCpIds.has(checkpointId)) {
    supabase.from('checkpoint_scans').insert({
      participant_id: participant.id,
      checkpoint_id: checkpointId,
      status: 'DUPLICATE' as ScanStatus,
      scanner_session_id: scannerSessionId ?? null,
      rejection_reason: 'Checkpoint ini sudah tercatat.',
    }).then(() => {});
    return { success: false, status: 'DUPLICATE', message: 'Checkpoint ini sudah tercatat.', participant, checkpoint };
  }

  // ── Sequence check ─────────────────────────────────────────────────────────
  const active = allCheckpoints.filter((c: any) => c.active);
  for (const cp of active) {
    if (cp.sequence < checkpoint.sequence && !completedCpIds.has(cp.id)) {
      const reason = `${cp.name} belum dilewati.`;
      supabase.from('checkpoint_scans').insert({
        participant_id: participant.id,
        checkpoint_id: checkpointId,
        status: 'REJECTED' as ScanStatus,
        scanner_session_id: scannerSessionId ?? null,
        rejection_reason: reason,
      }).then(() => {});
      return { success: false, status: 'REJECTED', message: reason, participant, checkpoint };
    }
  }

  // ── Finish check ───────────────────────────────────────────────────────────
  if (checkpoint.checkpoint_code === 'FINISH') {
    for (const req of active.filter((c: any) => c.checkpoint_code !== 'FINISH')) {
      if (!completedCpIds.has(req.id)) {
        const reason = 'Peserta belum menyelesaikan seluruh checkpoint.';
        supabase.from('checkpoint_scans').insert({
          participant_id: participant.id,
          checkpoint_id: checkpointId,
          status: 'REJECTED' as ScanStatus,
          scanner_session_id: scannerSessionId ?? null,
          rejection_reason: reason,
        }).then(() => {});
        return { success: false, status: 'REJECTED', message: reason, participant, checkpoint };
      }
    }
  }

  // ── Round-trip 3: insert scan + update status in parallel ─────────────────
  const newStatus = checkpoint.checkpoint_code === 'FINISH' ? 'FINISHED' : 'RUNNING';

  const [{ data: scan }] = await Promise.all([
    supabase.from('checkpoint_scans')
      .insert({
        participant_id: participant.id,
        checkpoint_id: checkpointId,
        status: 'VALID' as ScanStatus,
        scanner_session_id: scannerSessionId ?? null,
      })
      .select('scanned_at')
      .single(),
    supabase.from('participants')
      .update({ status: newStatus })
      .eq('id', participant.id),
  ]);

  return {
    success: true,
    status: 'VALID',
    message: checkpoint.checkpoint_code === 'FINISH'
      ? 'Finish berhasil tercatat!'
      : `${checkpoint.name} berhasil tercatat.`,
    participant,
    checkpoint,
    scanned_at: scan?.scanned_at,
  };
}
