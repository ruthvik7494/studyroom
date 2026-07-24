import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface DetailSectionCardProps {
  icon: ReactNode;
  title: string;
  headingId?: string;
  action?: ReactNode;
  children: ReactNode;
}

/** Icon + bold title header, content below — the card shape used throughout the redesigned centre detail page. */
export function DetailSectionCard({ icon, title, headingId, action, children }: DetailSectionCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="text-muted-foreground">{icon}</span>
          <CardTitle id={headingId} className="text-base">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}
