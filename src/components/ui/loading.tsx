interface LoadingProps {
  text?: string;
}

export function Loading({ text = 'Memuat...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-border-subtle border-t-info animate-spin" />
      <p className="text-[14px] text-text-secondary">{text}</p>
    </div>
  );
}
