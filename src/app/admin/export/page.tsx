'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Download, FileText, CheckCircle } from 'lucide-react';

const CATEGORIES = ['ALL', '5K', '10K', 'OPEN', 'TEEN', 'JUNIOR'];

const EXPORT_FIELDS = [
  { field: 'Rank', desc: 'Peringkat finisher' },
  { field: 'Bib', desc: 'Nomor bib peserta' },
  { field: 'Peserta', desc: 'Nama lengkap' },
  { field: 'Kategori', desc: 'Kategori lomba' },
  { field: 'CP Time', desc: 'Waktu setiap checkpoint' },
  { field: 'Finish Time', desc: 'Waktu finish' },
  { field: 'Durasi', desc: 'Total waktu tempuh' },
  { field: 'Status', desc: 'Status akhir peserta' },
];

export default function ExportPage() {
  const [category, setCategory] = useState('ALL');
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setDone(false);
    try {
      const url = category !== 'ALL' ? `/api/export?category=${category}` : '/api/export';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Export gagal');

      const blob = await res.blob();
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]
        ?? `race-results-${Date.now()}.csv`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      alert('Export gagal. Coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-[28px] font-bold text-text-primary">Export Data</h1>
        <p className="text-[14px] text-text-secondary">Download hasil lomba dalam format CSV.</p>
      </div>

      {/* Export card */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-info/10 text-info flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-text-primary">Hasil Lomba (CSV)</p>
            <p className="text-[13px] text-text-secondary">Kompatibel dengan Excel dan Google Sheets</p>
          </div>
        </div>

        <Select
          label="Filter Kategori"
          value={category}
          onChange={e => setCategory(e.target.value)}
          options={CATEGORIES.map(c => ({ value: c, label: c === 'ALL' ? 'Semua Kategori' : c }))}
        />

        <Button
          className="w-full"
          size="lg"
          onClick={handleExport}
          disabled={exporting}
        >
          {done ? (
            <><CheckCircle size={18} /> Berhasil didownload</>
          ) : exporting ? (
            <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Menyiapkan...</>
          ) : (
            <><Download size={18} /> Download CSV</>
          )}
        </Button>
      </div>

      {/* Fields preview */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <p className="text-[14px] font-semibold text-text-primary">Kolom yang diekspor</p>
        </div>
        <div className="divide-y divide-border-subtle">
          {EXPORT_FIELDS.map(f => (
            <div key={f.field} className="flex items-center justify-between px-5 py-3">
              <span className="text-[13px] font-mono font-medium text-text-primary">{f.field}</span>
              <span className="text-[12px] text-text-secondary">{f.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
