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
        'mt-1 flex flex-row flex-wrap items-end justify-between gap-3',
        className,
      )}
    >
      <div>
        {eyebrow && <p className="section-label">{eyebrow}</p>}
        <h1 className="text-3xl text-selva">{title}</h1>
        {/* El subrayado cobre de la marca: separa el título de su descripción. */}
        <span
          aria-hidden="true"
          className="mt-2 block h-1 w-12 rounded-full bg-cobre"
        />
        {description && (
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
