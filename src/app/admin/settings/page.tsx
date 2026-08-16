'use client';

import { useState } from 'react';
import { Settings, Info, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const [eventName, setEventName] = useState('Running Event 2026');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real implementation this would persist to DB/env
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-[28px] font-bold text-text-primary">Settings</h1>
        <p className="text-[14px] text-text-secondary">Konfigurasi sistem checkpoint.</p>
      </div>

      {/* Event info */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <Settings size={18} className="text-text-secondary" />
          <p className="text-[14px] font-semibold text-text-primary">Informasi Event</p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-text-secondary">Nama Event</label>
            <input
              value={eventName}
              onChange={e => setEventName(e.target.value)}
              className="w-full h-10 rounded-xl bg-surface-elevated border border-border-subtle px-3 text-[14px] text-text-primary outline-none focus:border-info/50"
            />
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-info text-white text-[14px] font-medium hover:bg-info/90 transition-colors"
          >
            {saved ? 'Tersimpan ✓' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* System info */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <Info size={18} className="text-text-secondary" />
          <p className="text-[14px] font-semibold text-text-primary">Informasi Sistem</p>
        </div>
        <div className="divide-y divide-border-subtle">
          {[
            { label: 'Stack', value: 'Next.js 16 + Supabase + PostgreSQL' },
            { label: 'Realtime', value: 'Supabase Realtime (Postgres Changes)' },
            { label: 'QR Scan', value: 'html5-qrcode (browser camera API)' },
            { label: 'QR Generate', value: 'qrcode (server-side)' },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between px-5 py-3">
              <span className="text-[13px] text-text-secondary">{row.label}</span>
              <span className="text-[13px] text-text-primary font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Database setup link */}
      <div className="glass rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center shrink-0">
          <Info size={20} />
        </div>
        <div className="space-y-1">
          <p className="text-[14px] font-semibold text-text-primary">Setup Database</p>
          <p className="text-[13px] text-text-secondary leading-relaxed">
            Jalankan <span className="font-mono text-info">supabase-schema.sql</span> di Supabase SQL Editor untuk membuat semua tabel, index, dan RLS policies. Isi <span className="font-mono text-info">.env.local</span> dengan URL dan key Supabase kamu.
          </p>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[13px] text-info hover:underline mt-1"
          >
            Buka Supabase Dashboard <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
