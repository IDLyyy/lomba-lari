'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Radio,
  MapPin,
  Smartphone,
  Trophy,
  FileSearch,
  Download,
  Settings,
  Menu,
  X,
  Activity,
} from 'lucide-react';

const navItems = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/participants', label: 'Peserta', icon: Users },
  { href: '/admin/live', label: 'Live Race', icon: Radio },
  { href: '/admin/checkpoints', label: 'Checkpoint', icon: MapPin },
  { href: '/admin/scanners', label: 'Scanner', icon: Smartphone },
  { href: '/admin/ranking', label: 'Ranking', icon: Trophy },
  { href: '/admin/audit', label: 'Audit Log', icon: FileSearch },
  { href: '/admin/export', label: 'Export', icon: Download },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-background overflow-hidden">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 glass border-r border-border-subtle flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border-subtle">
          <div className="w-8 h-8 rounded-lg bg-info flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-text-primary">Race Control</p>
            <p className="text-[11px] text-text-secondary">QR Checkpoint System</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200',
                  active
                    ? 'bg-info/15 text-info'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle">
          <Link
            href="/scanner"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-surface-elevated text-[13px] font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Smartphone size={16} />
            Open Scanner
          </Link>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-text-secondary hover:text-text-primary">
            <Menu size={24} />
          </button>
          <p className="text-[17px] font-semibold text-text-primary">Race Control</p>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
