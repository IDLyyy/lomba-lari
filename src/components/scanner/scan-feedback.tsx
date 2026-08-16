'use client';

import { useEffect, useRef } from 'react';
import { Check, AlertTriangle, Copy, WifiOff } from 'lucide-react';
import type { ScanResult } from '@/types';

interface ScanFeedbackProps {
  result: ScanResult | null;
  onDismiss: () => void;
}

export function ScanFeedback({ result, onDismiss }: ScanFeedbackProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!result) return;

    // Clear any existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    const delay = result.success ? 1200 : 2000;
    timerRef.current = setTimeout(onDismiss, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [result, onDismiss]);

  if (!result) return null;

  // ── SUCCESS ──────────────────────────────────────────────────
  if (result.success) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center pb-12 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onDismiss}
      >
        <div className="flex flex-col items-center gap-3 animate-scale-in px-8 text-center">
          <div
            className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center"
            style={{ animation: 'pulse-success 0.8s ease-out' }}
          >
            <Check size={44} className="text-success" strokeWidth={3} />
          </div>
          <p className="text-[28px] font-bold text-white">{result.participant?.bib_number}</p>
          <p className="text-[16px] text-white/80">{result.participant?.name}</p>
          <p className="text-[14px] text-success font-medium">{result.checkpoint?.name} berhasil</p>
          {result.scanned_at && (
            <p className="text-[13px] text-white/50">
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
      <div
        className="fixed inset-0 z-50 flex items-end justify-center pb-12 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onDismiss}
      >
        <div className="flex flex-col items-center gap-3 animate-scale-in px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center">
            <Copy size={40} className="text-warning" />
          </div>
          {result.participant && (
            <p className="text-[22px] font-bold text-white">{result.participant.bib_number}</p>
          )}
          <p className="text-[15px] text-warning font-medium">Sudah tercatat</p>
          <p className="text-[13px] text-white/60">{result.message}</p>
        </div>
      </div>
    );
  }

  // ── OFFLINE / NETWORK ────────────────────────────────────────
  if (result.message?.includes('Offline') || result.message?.includes('Koneksi')) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end justify-center pb-12 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.75)' }}
        onClick={onDismiss}
      >
        <div className="flex flex-col items-center gap-3 animate-scale-in px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center">
            <WifiOff size={40} className="text-warning" />
          </div>
          <p className="text-[15px] text-warning font-medium">Offline</p>
          <p className="text-[13px] text-white/60">{result.message}</p>
        </div>
      </div>
    );
  }

  // ── REJECTED ─────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-12 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onDismiss}
    >
      <div className="flex flex-col items-center gap-3 animate-scale-in px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-error/20 flex items-center justify-center">
          <AlertTriangle size={40} className="text-error" />
        </div>
        {result.participant && (
          <p className="text-[22px] font-bold text-white">{result.participant.bib_number}</p>
        )}
        <p className="text-[15px] text-error font-medium">{result.message}</p>
      </div>
    </div>
  );
}
