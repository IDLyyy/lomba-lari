'use client';

import { useEffect, useRef } from 'react';
import { Check, AlertTriangle, Copy, WifiOff, Loader2 } from 'lucide-react';
import type { ScanResult } from '@/types';

export type FeedbackState =
  | { phase: 'idle' }
  | { phase: 'pending'; qrText: string }           // QR detected, waiting for server
  | { phase: 'done'; result: ScanResult };          // server responded

interface ScanFeedbackProps {
  state: FeedbackState;
  onDismiss: () => void;
}

export function ScanFeedback({ state, onDismiss }: ScanFeedbackProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss only after server responds
  useEffect(() => {
    if (state.phase !== 'done') return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = state.result.success ? 1000 : 1800;
    timerRef.current = setTimeout(onDismiss, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state, onDismiss]);

  if (state.phase === 'idle') return null;

  // ── PENDING — show immediately when QR is detected ──────────
  if (state.phase === 'pending') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center pb-16"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <div className="flex flex-col items-center gap-3 animate-fade-in text-center">
          <div className="w-16 h-16 rounded-full bg-info/20 flex items-center justify-center">
            <Loader2 size={32} className="text-info animate-spin" />
          </div>
          <p className="text-[13px] text-white/50 font-mono">{state.qrText.slice(0, 20)}</p>
          <p className="text-[13px] text-white/40">Memverifikasi...</p>
        </div>
      </div>
    );
  }

  const { result } = state;

  // ── SUCCESS ──────────────────────────────────────────────────
  if (result.success) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center pb-12 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onDismiss}
      >
        <div className="flex flex-col items-center gap-3 animate-scale-in text-center px-8">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center"
            style={{ animation: 'pulse-success 0.8s ease-out' }}>
            <Check size={44} className="text-success" strokeWidth={3} />
          </div>
          <p className="text-[30px] font-bold text-white leading-none">{result.participant?.bib_number}</p>
          <p className="text-[16px] text-white/80">{result.participant?.name}</p>
          <p className="text-[14px] text-success font-medium">{result.checkpoint?.name} berhasil</p>
          {result.scanned_at && (
            <p className="text-[12px] text-white/40">
              {new Date(result.scanned_at).toLocaleTimeString('id-ID', { hour12: false })}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── DUPLICATE ────────────────────────────────────────────────
  if (result.status === 'DUPLICATE') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-12 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onDismiss}>
        <div className="flex flex-col items-center gap-3 animate-scale-in text-center px-8">
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center">
            <Copy size={40} className="text-warning" />
          </div>
          {result.participant && <p className="text-[24px] font-bold text-white">{result.participant.bib_number}</p>}
          <p className="text-[15px] text-warning font-medium">Sudah tercatat</p>
        </div>
      </div>
    );
  }

  // ── OFFLINE ──────────────────────────────────────────────────
  if (result.message?.includes('Offline') || result.message?.includes('Koneksi')) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-12 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onDismiss}>
        <div className="flex flex-col items-center gap-3 animate-scale-in text-center px-8">
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center">
            <WifiOff size={40} className="text-warning" />
          </div>
          <p className="text-[14px] text-warning/80">{result.message}</p>
        </div>
      </div>
    );
  }

  // ── REJECTED ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-12 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onDismiss}>
      <div className="flex flex-col items-center gap-3 animate-scale-in text-center px-8">
        <div className="w-20 h-20 rounded-full bg-error/20 flex items-center justify-center">
          <AlertTriangle size={40} className="text-error" />
        </div>
        {result.participant && <p className="text-[24px] font-bold text-white">{result.participant.bib_number}</p>}
        <p className="text-[15px] text-error font-medium">{result.message}</p>
      </div>
    </div>
  );
}
