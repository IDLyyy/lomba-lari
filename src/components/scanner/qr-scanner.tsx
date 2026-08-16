'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (data: string) => void;
  paused: boolean;
}

export function QrScanner({ onScan, paused }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const pausedRef = useRef(paused);

  // Keep pausedRef in sync without re-running the scanner effect
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const handleScan = useCallback((decodedText: string) => {
    // If paused, silently ignore — camera stays on but we don't trigger onScan
    if (pausedRef.current) return;

    const now = Date.now();
    // Debounce: same token within 3s is ignored
    if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
    lastScanRef.current = decodedText;
    lastScanTimeRef.current = now;
    onScan(decodedText);
  }, [onScan]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      handleScan,
      () => {} // ignore verbose scan errors
    ).catch((err) => {
      console.error('Camera start error:', err);
      startedRef.current = false;
    });

    return () => {
      scanner.stop().catch(() => {}).finally(() => scanner.clear());
      startedRef.current = false;
    };
  }, [handleScan]);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden bg-black">
      <div id="qr-reader" className="w-full h-full" />

      {/* Corner bracket overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-[15%] border-2 border-white/20 rounded-2xl" />
        <div className="absolute top-[15%] left-[15%] w-8 h-8 border-t-2 border-l-2 border-info rounded-tl-lg" />
        <div className="absolute top-[15%] right-[15%] w-8 h-8 border-t-2 border-r-2 border-info rounded-tr-lg" />
        <div className="absolute bottom-[15%] left-[15%] w-8 h-8 border-b-2 border-l-2 border-info rounded-bl-lg" />
        <div className="absolute bottom-[15%] right-[15%] w-8 h-8 border-b-2 border-r-2 border-info rounded-br-lg" />
      </div>

      {/* Paused dimming */}
      {paused && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        </div>
      )}
    </div>
  );
}
