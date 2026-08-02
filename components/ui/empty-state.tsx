import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Emoji or small icon shown above the message. */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Optional call-to-action — usually a <Link> or <button>. */
  action?: ReactNode;
  className?: string;
}

/**
 * Shared empty-state primitive: icon + title + description + optional CTA,
 * inside a dashed-border box. Used wherever a list/search/dashboard section
 * has nothing to show, instead of a blank area or an ad-hoc one-off block.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center ${className ?? ''}`}>
      {icon && <span className="text-4xl" aria-hidden>{icon}</span>}
      <h3 className="mt-3 font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
