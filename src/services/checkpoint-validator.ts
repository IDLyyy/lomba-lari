import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { ScanResult, ScanStatus } from '@/types';

export async function validateAndRecordScan(
  qrToken: string,
  checkpointId: string,
  scannerSessionId?: string
): Promise<ScanResult> {
  const supabase = createServerSupabaseClient();

  const { data: participant, error: pErr } = await supabase
    .from('participants')
    .select('*')
    .eq('qr_token', qrToken)
    .single();

  if (pErr || !participant) {
    return { success: false, status: 'REJECTED', message: 'Peserta tidak ditemukan.' };
  }

  const { data: checkpoint, error: cErr } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('id', checkpointId)
    .single();

  if (cErr || !checkpoint) {
    return { success: false, status: 'REJECTED', message: 'Checkpoint tidak ditemukan.' };
  }

  if (!checkpoint.active) {
    return { success: false, status: 'REJECTED', message: 'Checkpoint tidak aktif.' };
  }

  const { data: existingScan } = await supabase
    .from('checkpoint_scans')
    .select('*')
    .eq('participant_id', participant.id)
    .eq('checkpoint_id', checkpointId)
    .eq('status', 'VALID')
    .maybeSingle();

  if (existingScan) {
    await supabase.from('checkpoint_scans').insert({
      participant_id: participant.id,
      checkpoint_id: checkpointId,
      status: 'DUPLICATE' as ScanStatus,
      scanner_session_id: scannerSessionId || null,
      rejection_reason: 'Checkpoint ini sudah tercatat.',
    });
    return {
      success: false,
      status: 'DUPLICATE',
      message: 'Checkpoint ini sudah tercatat.',
      participant,
      checkpoint,
    };
  }

  const { data: allCheckpoints } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('active', true)
    .order('sequence', { ascending: true });

  const { data: validScans } = await supabase
    .from('checkpoint_scans')
    .select('*, checkpoint:checkpoints(*)')
    .eq('participant_id', participant.id)
    .eq('status', 'VALID')
    .order('scanned_at', { ascending: true });

  const completedSequences = (validScans || [])
    .map((s: any) => s.checkpoint?.sequence)
    .filter(Boolean)
    .sort((a: number, b: number) => a - b);

  const currentCheckpointSequence = checkpoint.sequence;

  const requiredPrevSequences = (allCheckpoints || [])
    .filter((cp: any) => cp.sequence < currentCheckpointSequence)
    .map((cp: any) => cp.sequence);

  for (const reqSeq of requiredPrevSequences) {
    if (!completedSequences.includes(reqSeq)) {
      const missingCp = (allCheckpoints || []).find((cp: any) => cp.sequence === reqSeq);
      const reason = missingCp
        ? `${missingCp.name} belum dilewati.`
        : `Checkpoint sebelumnya belum dilewati.`;

      await supabase.from('checkpoint_scans').insert({
        participant_id: participant.id,
        checkpoint_id: checkpointId,
        status: 'REJECTED' as ScanStatus,
        scanner_session_id: scannerSessionId || null,
        rejection_reason: reason,
      });

      return {
        success: false,
        status: 'REJECTED',
        message: reason,
        participant,
        checkpoint,
      };
    }
  }

  const isFinish = checkpoint.checkpoint_code === 'FINISH';
  if (isFinish) {
    const requiredCheckpoints = (allCheckpoints || []).filter(
      (cp: any) => cp.checkpoint_code !== 'FINISH'
    );
    for (const req of requiredCheckpoints) {
      if (!completedSequences.includes(req.sequence)) {
        const reason = 'Peserta belum menyelesaikan seluruh checkpoint.';
        await supabase.from('checkpoint_scans').insert({
          participant_id: participant.id,
          checkpoint_id: checkpointId,
          status: 'REJECTED' as ScanStatus,
          scanner_session_id: scannerSessionId || null,
          rejection_reason: reason,
        });
        return { success: false, status: 'REJECTED', message: reason, participant, checkpoint };
      }
    }
  }

  const { data: scan } = await supabase
    .from('checkpoint_scans')
    .insert({
      participant_id: participant.id,
      checkpoint_id: checkpointId,
      status: 'VALID' as ScanStatus,
      scanner_session_id: scannerSessionId || null,
    })
    .select()
    .single();

  const newStatus = isFinish ? 'FINISHED' : 'RUNNING';
  await supabase
    .from('participants')
    .update({ status: newStatus })
    .eq('id', participant.id);

  return {
    success: true,
    status: 'VALID',
    message: isFinish ? 'Finish berhasil tercatat!' : `${checkpoint.name} berhasil tercatat.`,
    participant,
    checkpoint,
    scanned_at: scan?.scanned_at,
  };
}
