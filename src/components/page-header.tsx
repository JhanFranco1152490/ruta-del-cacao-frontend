import type { ReactNode } from 'react';
import { cn } from 'cn';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  // Para las pantallas de trabajo donde el espacio es del contenido: título más chico y sin aire
  // de más alrededor.
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-end sm:justify-between',
        compact ? 'mt-1 gap-3' : 'mt-4 gap-5',
        className,
      )}
    >
      <div>
        {eyebrow && <p className="section-label">{eyebrow}</p>}
        <h1
          className={cn('text-selva', compact ? 'text-3xl' : 'mt-2 text-4xl')}
        >
          {title}
        </h1>
        {/* El subrayado cobre de la marca: separa el título de su descripción. */}
        <span
          aria-hidden="true"
          className={cn(
            'block h-1 w-12 rounded-full bg-cobre',
            compact ? 'mt-2' : 'mt-3',
          )}
        />
        {description && (
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
