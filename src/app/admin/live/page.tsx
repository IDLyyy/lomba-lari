'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { useRealtimeScans, useRealtimeParticipants } from '@/hooks/useRealtime';
import { Users, Radio } from 'lucide-react';
import { formatTime } from '@/lib/utils';

const CATEGORIES = ['ALL', '5K', '10K', 'OPEN', 'TEEN', 'JUNIOR'];

interface ParticipantRow {
  id: string;
  bib_number: string;
  name: string;
  category: string;
  status: string;
  checkpoints: Record<string, string | null>;
}

interface LiveData {
  participants: ParticipantRow[];
  checkpoints: { id: string; checkpoint_code: string; name: string; sequence: number }[];
}

function statusVariant(s: string): 'success' | 'info' | 'warning' | 'error' | 'default' {
  switch (s) {
    case 'FINISHED': return 'success';
    case 'RUNNING': return 'info';
    case 'DNF': return 'warning';
    case 'DISQUALIFIED': return 'error';
    default: return 'default';
  }
}

export default function LivePage() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const url = category !== 'ALL'
        ? `/api/participants/progress?category=${category}`
        : '/api/participants/progress';
      const res = await fetch(url);
      setData(await res.json());
    } catch {
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeScans(useCallback(() => fetchData(), [fetchData]));
  useRealtimeParticipants(useCallback(() => fetchData(), [fetchData]));

  const filtered = (data?.participants ?? []).filter(p => {
    if (!search) return true;
    return (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.bib_number.toLowerCase().includes(search.toLowerCase())
    );
  });

  // checkpoint distribution counts
  const checkpoints = data?.checkpoints ?? [];
  const distribution = checkpoints.map(cp => ({
    ...cp,
    count: (data?.participants ?? []).filter(p => p.checkpoints[cp.checkpoint_code] !== null).length,
  }));

  if (loading) return <Loading text="Memuat data live race..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio size={16} className="text-success animate-pulse" />
            <span className="text-[12px] font-medium text-success uppercase tracking-wider">Live</span>
          </div>
          <h1 className="text-[28px] font-bold text-text-primary">Live Race</h1>
          <p className="text-[14px] text-text-secondary">{data?.participants.length ?? 0} peserta terdaftar</p>
        </div>
        <div className="flex gap-3">
          <input
            placeholder="Cari peserta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 rounded-xl bg-surface-elevated border border-border-subtle px-3 text-[14px] text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-info/50 w-48"
          />
          <Select
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={CATEGORIES.map(c => ({ value: c, label: c === 'ALL' ? 'Semua' : c }))}
          />
        </div>
      </div>

      {/* Checkpoint distribution */}
      {distribution.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {distribution.map(cp => (
            <div key={cp.id} className="glass rounded-xl p-4">
              <p className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">{cp.name}</p>
              <p className="text-[32px] font-bold text-text-primary leading-none mt-1">{cp.count}</p>
              <p className="text-[12px] text-text-secondary mt-0.5">peserta</p>
            </div>
          ))}
        </div>
      )}

      {/* Race track visualization */}
      {checkpoints.length > 0 && (
        <div className="glass rounded-2xl p-5 overflow-x-auto">
          <p className="text-[12px] font-medium text-text-secondary uppercase tracking-wider mb-4">Jalur Lomba</p>
          <div className="flex items-center gap-0 min-w-max">
            <div className="flex flex-col items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-info" />
              <span className="text-[11px] text-text-secondary">START</span>
            </div>
            {checkpoints.map((cp, i) => {
              const count = distribution[i]?.count ?? 0;
              return (
                <div key={cp.id} className="flex items-center">
                  <div className="w-16 h-px bg-border-subtle mx-1" />
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-text-secondary/40" />
                    <span className="text-[11px] text-text-secondary whitespace-nowrap">{cp.checkpoint_code}</span>
                    <span className="text-[10px] text-info">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Participant table */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Users size={48} />} title="Belum ada peserta" description="Data akan muncul setelah peserta mulai discan." />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-4 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider whitespace-nowrap">Bib</th>
                  <th className="text-left px-4 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider whitespace-nowrap">Nama</th>
                  <th className="text-left px-4 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider whitespace-nowrap">Kat.</th>
                  {checkpoints.map(cp => (
                    <th key={cp.id} className="text-left px-4 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider whitespace-nowrap">
                      {cp.checkpoint_code}
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-mono font-medium text-text-primary whitespace-nowrap">{p.bib_number}</td>
                    <td className="px-4 py-3 text-[13px] text-text-primary whitespace-nowrap">{p.name}</td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary whitespace-nowrap">{p.category}</td>
                    {checkpoints.map(cp => {
                      const t = p.checkpoints[cp.checkpoint_code];
                      return (
                        <td key={cp.id} className="px-4 py-3 whitespace-nowrap">
                          {t ? (
                            <span className="text-[12px] text-success font-medium">{formatTime(t)}</span>
                          ) : (
                            <span className="text-[12px] text-text-secondary/40">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
