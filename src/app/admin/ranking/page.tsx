'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loading } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useRealtimeScans } from '@/hooks/useRealtime';
import { Trophy, Medal, RefreshCw } from 'lucide-react';
import { formatTime } from '@/lib/utils';

const CATEGORIES = ['ALL', '5K', '10K', 'OPEN', 'TEEN', 'JUNIOR'];

interface RankRow {
  rank: number;
  participant: { id: string; bib_number: string; name: string; category: string };
  finishTime: string | null;
  duration: string | null;
}

function rankColor(rank: number) {
  if (rank === 1) return 'text-warning';
  if (rank === 2) return 'text-text-secondary';
  if (rank === 3) return 'text-warning/60';
  return 'text-text-secondary/60';
}

export default function RankingPage() {
  const [rows, setRows] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('ALL');

  const fetchData = useCallback(async () => {
    try {
      const url = category !== 'ALL' ? `/api/ranking?category=${category}` : '/api/ranking';
      const res = await fetch(url);
      setRows(await res.json());
    } catch {} finally { setLoading(false); }
  }, [category]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useRealtimeScans(useCallback(() => fetchData(), [fetchData]));

  if (loading) return <Loading text="Memuat ranking..." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-text-primary">Ranking</h1>
          <p className="text-[14px] text-text-secondary">{rows.length} peserta finish</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={category}
            onChange={e => setCategory(e.target.value)}
            options={CATEGORIES.map(c => ({ value: c, label: c === 'ALL' ? 'Semua Kategori' : c }))}
          />
          <Button variant="secondary" size="sm" onClick={fetchData}>
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Top 3 podium */}
      {rows.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map(i => {
            const row = rows[i];
            if (!row) return <div key={i} />;
            return (
              <div
                key={row.rank}
                className={`glass rounded-2xl p-4 text-center ${row.rank === 1 ? 'ring-1 ring-warning/30' : ''}`}
              >
                <div className={`text-[32px] font-bold ${rankColor(row.rank)} mb-1`}>
                  {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : '🥉'}
                </div>
                <p className="text-[13px] font-mono font-medium text-text-primary">{row.participant.bib_number}</p>
                <p className="text-[13px] text-text-secondary truncate">{row.participant.name}</p>
                <p className="text-[12px] text-info mt-1">{row.duration ?? '—'}</p>
              </div>
            );
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<Trophy size={48} />}
          title="Belum ada peserta finish"
          description="Ranking akan muncul setelah peserta berhasil melewati semua checkpoint."
        />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider w-16">Rank</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Bib</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Nama</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Kategori</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Finish</th>
                  <th className="text-left px-5 py-3 text-[12px] font-medium text-text-secondary uppercase tracking-wider">Durasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map(row => (
                  <tr key={row.participant.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {row.rank <= 3 ? (
                          <Medal size={16} className={rankColor(row.rank)} />
                        ) : null}
                        <span className={`text-[15px] font-bold ${rankColor(row.rank)}`}>{row.rank}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[13px] font-mono font-medium text-text-primary">{row.participant.bib_number}</td>
                    <td className="px-5 py-3 text-[14px] text-text-primary">{row.participant.name}</td>
                    <td className="px-5 py-3"><Badge>{row.participant.category}</Badge></td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary">{row.finishTime ? formatTime(row.finishTime) : '—'}</td>
                    <td className="px-5 py-3 text-[14px] font-medium text-success">{row.duration ?? '—'}</td>
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
