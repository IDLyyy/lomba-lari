import { NextRequest, NextResponse } from 'next/server';
import { validateAndRecordScan } from '@/services/checkpoint-validator';

export async function POST(request: NextRequest) {
  try {
    const { qr_token, checkpoint_id, scanner_session_id } = await request.json();

    if (!qr_token || !checkpoint_id) {
      return NextResponse.json(
        { success: false, status: 'REJECTED', message: 'Data scan tidak lengkap.' },
        { status: 400 }
      );
    }

    const result = await validateAndRecordScan(qr_token, checkpoint_id, scanner_session_id);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch {
    return NextResponse.json(
      { success: false, status: 'REJECTED', message: 'Terjadi kesalahan server.' },
      { status: 500 }
    );
  }
}
