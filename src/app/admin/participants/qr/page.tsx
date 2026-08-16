'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Printer, Download, QrCode, ChevronLeft } from 'lucide-react';
import type { Participant } from '@/types';
import Link from 'next/link';

const CATEGORIES = ['ALL', '5K', '10K', 'OPEN', 'TEEN', 'JUNIOR'];

export default function QrCodesPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const eventName = 'Running Event 2026';

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch('/api/participants');
      setParticipants(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchParticipants(); }, [fetchParticipants]);

  const filtered = participants.filter(p =>
    category === 'ALL' || p.category === category
  );

  const generateQrCodes = useCallback(async () => {
    if (filtered.length === 0) return;
    setGenerating(true);
    try {
      const QRCode = (await import('qrcode')).default;
      const map: Record<string, string> = {};
      for (const p of filtered) {
        map[p.id] = await QRCode.toDataURL(p.qr_token, {
          width: 200,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
      }
      setQrDataUrls(map);
    } catch (e) {
      console.error('QR generation error', e);
    } finally {
      setGenerating(false);
    }
  }, [filtered]);

  useEffect(() => {
    if (filtered.length > 0) generateQrCodes();
  }, [filtered.length, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePrint = () => window.print();

  if (loading) return <Loading text="Memuat peserta..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Screen-only header */}
      <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/participants" className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-[28px] font-bold text-text-primary">QR Codes</h1>
            <p className="text-[14px] text-text-secondary">{filtered.length} QR siap cetak</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={CATEGORIES.map(c => ({ value: c, label: c === 'ALL' ? 'Semua' : c }))}
          />
          <Button variant="secondary" onClick={generateQrCodes} disabled={generating}>
            <QrCode size={16} /> {generating ? 'Generating...' : 'Generate'}
          </Button>
          <Button onClick={handlePrint}>
            <Printer size={16} /> Cetak
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<QrCode size={48} />}
          title="Belum ada peserta"
          description="Tambahkan peserta terlebih dahulu."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 print:grid-cols-3 print:gap-6">
          {filtered.map(p => (
            <QrCard
              key={p.id}
              participant={p}
              qrDataUrl={qrDataUrls[p.id]}
              eventName={eventName}
            />
          ))}
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}

function QrCard({ participant, qrDataUrl, eventName }: {
  participant: Participant;
  qrDataUrl?: string;
  eventName: string;
}) {
  return (
    <div className="border border-border-subtle rounded-2xl p-4 flex flex-col items-center gap-3 bg-white text-black print:break-inside-avoid print:border-gray-300">
      {/* Event name */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 text-center">{eventName}</p>

      {/* Bib number */}
      <p className="text-[22px] font-bold tracking-tight text-black">{participant.bib_number}</p>

      {/* Name */}
      <p className="text-[13px] font-medium text-gray-700 text-center truncate w-full">{participant.name}</p>

      {/* QR code */}
      <div className="w-[120px] h-[120px] flex items-center justify-center bg-white">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={`QR ${participant.bib_number}`} className="w-full h-full" />
        ) : (
          <div className="w-full h-full rounded-lg bg-gray-100 animate-pulse" />
        )}
      </div>

      {/* Category */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{participant.category}</p>
    </div>
  );
}
