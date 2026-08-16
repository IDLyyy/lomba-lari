import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { ScanResult } from '@/types';

export async function validateAndRecordScan(
  qrToken: string,
  checkpointId: string,
  scannerSessionId?: string
): Promise<ScanResult> {
  const supabase = createServerSupabaseClient();

  // Sebelumnya: 7 query berurutan (participant, checkpoint, duplicate check,
  // allCheckpoints, validScans, insert, update) — masing-masing 1 network
  // round-trip ke Supabase, jadi bisa 1-2 detik per scan.
  //
  // Sekarang: seluruh validasi + insert + update peserta dieksekusi di dalam
  // database lewat 1 RPC call (function `process_scan`, lihat
  // 001_optimize_scan.sql) — cuma 1 round-trip.
  const { data, error } = await supabase.rpc('process_scan', {
    p_qr_token: qrToken,
    p_checkpoint_id: checkpointId,
    p_scanner_session_id: scannerSessionId || null,
  });

  if (error || !data) {
    return {
      success: false,
      status: 'REJECTED',
      message: 'Terjadi kesalahan server.',
    };
  }

  return data as ScanResult;
}
