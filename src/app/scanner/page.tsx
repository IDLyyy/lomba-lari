'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { QrScanner } from '@/components/scanner/qr-scanner';
import { ScanFeedback } from '@/components/scanner/scan-feedback';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Wifi, WifiOff, Settings, ChevronLeft } from 'lucide-react';
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
  const { isOnline, pendingCount, addToQueue } = useOfflineQueue();

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
          <Button className="w-full" size="lg" onClick={startScanner} disabled={!selectedCheckpoint || !deviceName}>
            Start Scanner
          </Button>
        </div>
      </div>
    );
  }

  /* ── SCANNING SCREEN ──────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">

      {/* Camera — fills entire screen */}
      <div className="absolute inset-0">
        <QrScanner onScan={handleScan} paused={!!scanResult} />
      </div>

      {/* Top bar — floats over camera */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-safe-top pb-3 pt-4"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <button
          onClick={handleReset}
          aria-label="Kembali ke setup"
          className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-95 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <p className="text-[16px] font-semibold text-white drop-shadow">{currentCheckpoint?.name ?? 'Scanner'}</p>
          <p className="text-[11px] text-white/60">Arahkan kamera ke QR code peserta</p>
        </div>

        {/* Connection pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-sm text-[11px] font-medium ${
          isOnline ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
        }`}>
          {isOnline
            ? <><Wifi size={11} /> {pendingCount > 0 ? pendingCount : 'ON'}</>
            : <><WifiOff size={11} /> {pendingCount > 0 ? pendingCount : 'OFF'}</>
          }
        </div>
      </div>

      {/* Bottom bar — floats over camera */}
      <div className="relative z-10 mt-auto px-4 pb-safe-bottom pb-8 pt-6"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)' }}>

        {lastScan?.participant ? (
          /* Last scan card */
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/10">
            <div className="w-9 h-9 rounded-xl bg-success/20 flex items-center justify-center text-success text-[16px] font-bold shrink-0">✓</div>
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
          <p className="text-center text-[13px] text-white/40">Belum ada scan</p>
        )}

        {/* Offline pending banner */}
        {!isOnline && pendingCount > 0 && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-warning">
            <WifiOff size={12} />
            <span>{pendingCount} scan pending — akan dikirim saat online</span>
          </div>
        )}
      </div>

      {/* Scan result overlay */}
      <ScanFeedback result={scanResult} onDismiss={() => setScanResult(null)} />
    </div>
  );
}
