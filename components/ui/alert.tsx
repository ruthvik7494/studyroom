import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const alertVariants = cva('flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm', {
  variants: {
    variant: {
      info: 'border-transparent bg-[hsl(var(--info))]/8 text-[hsl(var(--info))]',
      success: 'border-transparent bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
      warning: 'border-amber-200 bg-amber-50 text-amber-900',
      destructive: 'border-transparent bg-destructive/10 text-destructive',
    },
  },
  defaultVariants: { variant: 'info' },
});

const ICON: Record<string, string> = { info: 'ℹ️', success: '✓', warning: '⚠️', destructive: '✕' };

export interface AlertProps extends VariantProps<typeof alertVariants> {
  children: ReactNode;
  className?: string;
  /** Pass false to omit the leading icon (e.g. when the content already has one). */
  showIcon?: boolean;
}

/** Shared alert/notice box — replaces the various one-off colored boxes
 * (amber warnings, destructive errors, success confirmations) scattered
 * across the app with one consistent, token-driven component. */
export function Alert({ children, variant, className, showIcon = true }: AlertProps) {
  return (
    <div className={cn(alertVariants({ variant }), className)} role={variant === 'destructive' ? 'alert' : 'status'}>
      {showIcon && <span aria-hidden className="shrink-0">{ICON[variant ?? 'info']}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
