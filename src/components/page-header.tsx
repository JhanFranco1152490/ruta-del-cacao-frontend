import type { ReactNode } from 'react';
import { cn } from 'cn';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div>
        {eyebrow && <p className="section-label">{eyebrow}</p>}
        <h1 className="mt-2 text-4xl text-selva">{title}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
