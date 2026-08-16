import Link from 'next/link';
import { Activity, Smartphone, LayoutDashboard, Shield, Zap, Radio } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-subtle glass sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-info flex items-center justify-center">
            <Activity size={18} className="text-white" />
          </div>
          <span className="text-[15px] font-semibold text-text-primary">Race Control</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/scanner"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-[14px] font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <Smartphone size={16} />
            Scanner
          </Link>
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-info text-white text-[14px] font-medium hover:bg-info/90 transition-colors"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="animate-fade-in max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-info/10 border border-info/20 text-info text-[12px] font-medium mb-2">
            <Radio size={12} className="animate-pulse" />
            Real-time Checkpoint Tracking
          </div>

          <h1 className="text-[56px] font-bold text-text-primary leading-tight tracking-tight">
            Race Control
          </h1>
          <p className="text-[19px] text-text-secondary leading-relaxed max-w-lg mx-auto">
            Sistem QR checkpoint untuk lomba lari. Pantau peserta secara real-time, cegah kecurangan, dan kelola perlombaan dari satu dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-info text-white text-[15px] font-semibold hover:bg-info/90 transition-all active:scale-[0.97]"
            >
              <LayoutDashboard size={18} />
              Buka Dashboard
            </Link>
            <Link
              href="/scanner"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-surface-elevated border border-border-subtle text-text-primary text-[15px] font-semibold hover:bg-white/10 transition-all active:scale-[0.97]"
            >
              <Smartphone size={18} />
              Buka Scanner
            </Link>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Shield size={24} />,
              title: 'Anti-Cheating',
              desc: 'Peserta harus melewati setiap checkpoint secara berurutan. Tidak bisa skip.',
              color: 'text-success',
              bg: 'bg-success/10',
            },
            {
              icon: <Radio size={24} />,
              title: 'Real-time',
              desc: 'Dashboard update otomatis saat scan terjadi. Tanpa refresh manual.',
              color: 'text-info',
              bg: 'bg-info/10',
            },
            {
              icon: <Zap size={24} />,
              title: 'Cepat & Mudah',
              desc: 'Scanner dioptimalkan untuk smartphone. Buka, scan, lanjut.',
              color: 'text-warning',
              bg: 'bg-warning/10',
            },
          ].map(f => (
            <div key={f.title} className="glass rounded-2xl p-6 animate-fade-in">
              <div className={`w-12 h-12 rounded-xl ${f.bg} ${f.color} flex items-center justify-center mb-4`}>
                {f.icon}
              </div>
              <h3 className="text-[15px] font-semibold text-text-primary mb-1">{f.title}</h3>
              <p className="text-[13px] text-text-secondary leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle px-6 py-5 text-center">
        <p className="text-[13px] text-text-secondary">QR Checkpoint System — Running Event 2026</p>
      </footer>
    </div>
  );
}
