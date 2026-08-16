'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QrScanner } from '@/components/scanner/qr-scanner';
import { ScanFeedback } from '@/components/scanner/scan-feedback';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Wifi, WifiOff, Settings, ChevronLeft, Camera } from 'lucide-react';
import type { Checkpoint, ScanResult, ScannerSession } from '@/types';

type ScannerState = 'setup' | 'scanning';

export default function ScannerPage() {
  const [state, setState] = useState<ScannerState>('setup');
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [session, setSession] = useState<ScannerSession | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const warmStreamRef = useRef<MediaStream | null>(null);
  const { isOnline, pendingCount, addToQueue } = useOfflineQueue();

  // Load checkpoints + restore session
  useEffect(() => {
    fetch('/api/checkpoints')
      .then(r => r.json())
      .then(setCheckpoints)
      .catch(() => {});

    const saved = localStorage.getItem('scanner_session');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSession(s);
        setSelectedCheckpoint(s.checkpoint_id);
        setDeviceName(s.device_name);
        setState('scanning');
      } catch {}
    }
  }, []);

  // Warm-up camera as soon as a checkpoint is selected — so stream is ready before "Start"
  useEffect(() => {
    if (!selectedCheckpoint || state !== 'setup') return;

    setCameraReady(false);
    setCameraError('');

    let cancelled = false;

    navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60 },
      },
      audio: false,
    }).then(stream => {
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      // Stop any previous warm stream
      warmStreamRef.current?.getTracks().forEach(t => t.stop());
      warmStreamRef.current = stream;
      setCameraReady(true);
    }).catch(err => {
      if (!cancelled) {
        console.error('Warm-up camera error:', err);
        setCameraError('Izin kamera ditolak atau tidak tersedia.');
      }
    });

    return () => { cancelled = true; };
  }, [selectedCheckpoint, state]);

  // Cleanup warm stream on unmount
  useEffect(() => {
    return () => {
      warmStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startScanner = async () => {
    if (!selectedCheckpoint || !deviceName) return;
    try {
      const res = await fetch('/api/scanner-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpoint_id: selectedCheckpoint, device_name: deviceName }),
      });
      const s = await res.json();
      setSession(s);
      localStorage.setItem('scanner_session', JSON.stringify(s));
      setState('scanning');
      // Don't stop warm stream — pass it to QrScanner
    } catch {}
  };

  const handleScan = useCallback(async (qrToken: string) => {
    if (!session) return;

    if (!isOnline) {
      addToQueue({ qr_token: qrToken, checkpoint_id: session.checkpoint_id, scanner_session_id: session.id });
      setScanResult({ success: false, status: 'REJECTED', message: 'Offline — scan disimpan dan akan dikirim saat online kembali.' });
      return;
    }

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_token: qrToken, checkpoint_id: session.checkpoint_id, scanner_session_id: session.id }),
      });
      const result: ScanResult = await res.json();
      setScanResult(result);
      if (result.success) setLastScan(result);
    } catch {
      addToQueue({ qr_token: qrToken, checkpoint_id: session.checkpoint_id, scanner_session_id: session.id });
      setScanResult({ success: false, status: 'REJECTED', message: 'Koneksi bermasalah. Scan disimpan dan akan dikirim ulang.' });
    }
  }, [session, isOnline, addToQueue]);

  const handleReset = () => {
    // Stop warm stream when going back to setup
    warmStreamRef.current?.getTracks().forEach(t => t.stop());
    warmStreamRef.current = null;
    setCameraReady(false);
    setState('setup');
    setSession(null);
    localStorage.removeItem('scanner_session');
  };

  const currentCheckpoint = checkpoints.find(c => c.id === session?.checkpoint_id);

  /* ── SETUP SCREEN ─────────────────────────────────────────── */
  if (state === 'setup') {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-info/15 flex items-center justify-center mx-auto mb-4">
              <Settings size={32} className="text-info" />
            </div>
            <h1 className="text-[24px] font-bold text-text-primary">Set Scanner</h1>
            <p className="text-[14px] text-text-secondary mt-1">Pilih checkpoint untuk scanner ini</p>
          </div>

          <div className="space-y-4">
            <Select
              label="Checkpoint"
              value={selectedCheckpoint}
              onChange={e => setSelectedCheckpoint(e.target.value)}
              options={[
                { value: '', label: 'Pilih checkpoint...' },
                ...checkpoints.map(c => ({ value: c.id, label: c.name })),
              ]}
            />
            <Input
              label="Nama Device"
              placeholder="CP01-Phone-01"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
            />
          </div>

          {/* Camera warm-up status */}
          {selectedCheckpoint && (
            <div className={`flex items-center gap-2 text-[13px] px-3 py-2 rounded-xl ${
              cameraError ? 'bg-error/10 text-error' :
              cameraReady ? 'bg-success/10 text-success' :
              'bg-surface-elevated text-text-secondary'
            }`}>
              {cameraError ? (
                <>{cameraError}</>
              ) : cameraReady ? (
                <><Camera size={14} /> Kamera siap</>
              ) : (
                <><div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" /> Menyiapkan kamera...</>
              )}
            </div>
          )}

          {cameraError && (
            <p className="text-[12px] text-text-secondary text-center -mt-4">
              Pastikan izin kamera sudah diberikan di pengaturan browser.
            </p>
          )}

          <Button
            className="w-full"
            size="lg"
            onClick={startScanner}
            disabled={!selectedCheckpoint || !deviceName || !!cameraError}
          >
            {cameraReady ? 'Start Scanner' : selectedCheckpoint ? 'Menunggu kamera...' : 'Start Scanner'}
          </Button>
        </div>
      </div>
    );
  }

  /* ── SCANNING SCREEN ──────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">

      {/* Camera — full screen, pass pre-warmed stream */}
      <div className="absolute inset-0">
        <QrScanner
          onScan={handleScan}
          paused={!!scanResult}
          stream={warmStreamRef.current}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pb-3 pt-12"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>
        <button
          onClick={handleReset}
          aria-label="Kembali ke setup"
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <p className="text-[16px] font-semibold text-white drop-shadow">{currentCheckpoint?.name ?? 'Scanner'}</p>
          <p className="text-[11px] text-white/50">Arahkan ke QR code peserta</p>
        </div>

        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm text-[11px] font-medium ${
          isOnline ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
        }`}>
          {isOnline
            ? <><Wifi size={11} />{pendingCount > 0 ? ` ${pendingCount}` : ' ON'}</>
            : <><WifiOff size={11} />{pendingCount > 0 ? ` ${pendingCount}` : ' OFF'}</>
          }
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 mt-auto px-4 pb-10 pt-6"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
        {lastScan?.participant ? (
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
            <div className="w-9 h-9 rounded-xl bg-success/20 flex items-center justify-center text-success font-bold text-[15px] shrink-0">✓</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white truncate">{lastScan.participant.bib_number} — {lastScan.participant.name}</p>
              <p className="text-[11px] text-white/50">{lastScan.checkpoint?.name}</p>
            </div>
            {lastScan.scanned_at && (
              <p className="text-[12px] text-white/50 shrink-0">
                {new Date(lastScan.scanned_at).toLocaleTimeString('id-ID', { hour12: false })}
              </p>
            )}
          </div>
        ) : (
          <p className="text-center text-[12px] text-white/30">Arahkan kamera ke QR code peserta</p>
        )}

        {!isOnline && pendingCount > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-warning">
            <WifiOff size={11} />
            <span>{pendingCount} scan pending</span>
          </div>
        )}
      </div>

      <ScanFeedback result={scanResult} onDismiss={() => setScanResult(null)} />
    </div>
  );
}
