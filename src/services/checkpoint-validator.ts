import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { ScanResult, ScanStatus } from '@/types';

export async function validateAndRecordScan(
  qrToken: string,
  checkpointId: string,
  scannerSessionId?: string
): Promise<ScanResult> {
  const supabase = createServerSupabaseClient();

  // ── Round-trip 1: fetch participant + target checkpoint + all checkpoints
  //    in parallel — one network hop instead of three sequential ones
  const [
    { data: participant },
    { data: checkpoint },
    { data: allCheckpoints },
  ] = await Promise.all([
    supabase.from('participants').select('*').eq('qr_token', qrToken).single(),
    supabase.from('checkpoints').select('*').eq('id', checkpointId).single(),
    supabase.from('checkpoints').select('id,sequence,checkpoint_code,name,active').order('sequence'),
  ]);

  if (!participant) {
    return { success: false, status: 'REJECTED', message: 'Peserta tidak ditemukan.' };
  }
  if (!checkpoint) {
    return { success: false, status: 'REJECTED', message: 'Checkpoint tidak ditemukan.' };
  }
  if (!checkpoint.active) {
    return { success: false, status: 'REJECTED', message: 'Checkpoint tidak aktif.' };
  }

  // ── Round-trip 2: fetch this participant's existing VALID scans
  const { data: validScans } = await supabase
    .from('checkpoint_scans')
    .select('checkpoint_id')
    .eq('participant_id', participant.id)
    .eq('status', 'VALID');

  const completedCpIds = new Set((validScans ?? []).map((s: any) => s.checkpoint_id));

  // Duplicate check
  if (completedCpIds.has(checkpointId)) {
    // Log duplicate (fire-and-forget, don't await)
    supabase.from('checkpoint_scans').insert({
      participant_id: participant.id,
      checkpoint_id: checkpointId,
      status: 'DUPLICATE' as ScanStatus,
      scanner_session_id: scannerSessionId ?? null,
      rejection_reason: 'Checkpoint ini sudah tercatat.',
    }).then(() => {});

    return {
      success: false,
      status: 'DUPLICATE',
      message: 'Checkpoint ini sudah tercatat.',
      participant,
      checkpoint,
    };
  }

  // Sequence check: every checkpoint with sequence < target must be completed
  const active = (allCheckpoints ?? []).filter((c: any) => c.active);
  for (const cp of active) {
    if (cp.sequence < checkpoint.sequence && !completedCpIds.has(cp.id)) {
      const reason = `${cp.name} belum dilewati.`;

      // Log rejection (fire-and-forget)
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

  // Finish check
  if (checkpoint.checkpoint_code === 'FINISH') {
    const nonFinish = active.filter((c: any) => c.checkpoint_code !== 'FINISH');
    for (const req of nonFinish) {
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

  // ── Round-trip 3: insert VALID scan + update participant status in parallel
  const newStatus = checkpoint.checkpoint_code === 'FINISH' ? 'FINISHED' : 'RUNNING';

  const [{ data: scan }] = await Promise.all([
    supabase
      .from('checkpoint_scans')
      .insert({
        participant_id: participant.id,
        checkpoint_id: checkpointId,
        status: 'VALID' as ScanStatus,
        scanner_session_id: scannerSessionId ?? null,
      })
      .select('scanned_at')
      .single(),
    supabase
      .from('participants')
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
