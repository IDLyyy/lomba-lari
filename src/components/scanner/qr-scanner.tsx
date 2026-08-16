'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QrScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

export function QrScanner({ onScan, active }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const handleScan = useCallback((decodedText: string) => {
    const now = Date.now();
    if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
    lastScanRef.current = decodedText;
    lastScanTimeRef.current = now;
    onScan(decodedText);
  }, [onScan]);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      handleScan,
      () => {}
    ).catch(() => {});

    return () => {
      scanner.stop().catch(() => {});
      scanner.clear();
    };
  }, [active, handleScan]);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden bg-black">
      <div id="qr-reader" ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-[15%] border-2 border-white/30 rounded-2xl" />
        <div className="absolute top-[15%] left-[15%] w-8 h-8 border-t-2 border-l-2 border-info rounded-tl-lg" />
        <div className="absolute top-[15%] right-[15%] w-8 h-8 border-t-2 border-r-2 border-info rounded-tr-lg" />
        <div className="absolute bottom-[15%] left-[15%] w-8 h-8 border-b-2 border-l-2 border-info rounded-bl-lg" />
        <div className="absolute bottom-[15%] right-[15%] w-8 h-8 border-b-2 border-r-2 border-info rounded-br-lg" />
      </div>
    </div>
  );
}
