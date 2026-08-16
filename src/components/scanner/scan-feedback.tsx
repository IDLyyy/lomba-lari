'use client';

import { useEffect } from 'react';
import { Check, AlertTriangle, Copy } from 'lucide-react';
import type { ScanResult } from '@/types';

interface ScanFeedbackProps {
  result: ScanResult | null;
  onDismiss: () => void;
}

export function ScanFeedback({ result, onDismiss }: ScanFeedbackProps) {
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onDismiss, result.success ? 2000 : 3000);
    return () => clearTimeout(timer);
  }, [result, onDismiss]);

  if (!result) return null;

  if (result.success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in" onClick={onDismiss}>
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center" style={{ animation: 'pulse-success 1s ease-in-out' }}>
            <Check size={48} className="text-success" />
          </div>
          <div className="text-center">
            <p className="text-[24px] font-bold text-text-primary">{result.participant?.bib_number}</p>
            <p className="text-[17px] text-text-secondary">{result.participant?.name}</p>
            <p className="text-[15px] text-success mt-2">{result.checkpoint?.name} berhasil tercatat</p>
            {result.scanned_at && (
              <p className="text-[13px] text-text-secondary mt-1">
                {new Date(result.scanned_at).toLocaleTimeString('id-ID', { hour12: false })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const icon = result.status === 'DUPLICATE' ? <Copy size={48} /> : <AlertTriangle size={48} />;
  const color = result.status === 'DUPLICATE' ? 'text-warning' : 'text-error';
  const bg = result.status === 'DUPLICATE' ? 'bg-warning/20' : 'bg-error/20';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in" onClick={onDismiss}>
      <div className="flex flex-col items-center gap-4 animate-scale-in px-8">
        <div className={`w-24 h-24 rounded-full ${bg} flex items-center justify-center`}>
          <span className={color}>{icon}</span>
        </div>
        <div className="text-center">
          {result.participant && (
            <p className="text-[20px] font-bold text-text-primary">{result.participant.bib_number}</p>
          )}
          <p className={`text-[17px] ${color} mt-2 font-medium`}>{result.message}</p>
        </div>
      </div>
    </div>
  );
}
