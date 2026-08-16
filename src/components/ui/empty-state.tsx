interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {icon && (
        <div className="text-text-secondary/30">{icon}</div>
      )}
      <div className="space-y-1">
        <p className="text-[15px] font-medium text-text-primary">{title}</p>
        {description && (
          <p className="text-[13px] text-text-secondary max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
