import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  subtitle?: string;
}

const variantStyles = {
  default: { icon: 'bg-white/08 text-text-secondary', value: 'text-text-primary' },
  success: { icon: 'bg-success/15 text-success', value: 'text-success' },
  warning: { icon: 'bg-warning/15 text-warning', value: 'text-warning' },
  error: { icon: 'bg-error/15 text-error', value: 'text-error' },
  info: { icon: 'bg-info/15 text-info', value: 'text-info' },
};

export function StatCard({ label, value, icon, variant = 'default', subtitle }: StatCardProps) {
  const styles = variantStyles[variant];
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-3">
      {icon && (
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', styles.icon)}>
          {icon}
        </div>
      )}
      <div>
        <p className={cn('text-[40px] font-bold leading-none tracking-tight', styles.value)}>
          {value}
        </p>
        <p className="text-[13px] text-text-secondary mt-1">{label}</p>
        {subtitle && <p className="text-[12px] text-text-secondary/60 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
