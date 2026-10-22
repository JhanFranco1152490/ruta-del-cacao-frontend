import { cn } from 'cn';
import type { ReactNode } from 'react';

import { type ModuleAccent, accentStyle } from './accent';

// Un bloque de contenido: tarjeta blanca con un filete del acento arriba, su título,
// un contador y sus acciones. El filete se recorta con las esquinas (no es un borde), así que
// tiene el mismo grosor de punta a punta.
export function SectionCard({
  title,
  count,
  actions,
  accent,
  className,
  children,
  id,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  accent: ModuleAccent;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const headingId = id ? `${id}-titulo` : undefined;
  return (
    <section
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : title}
      className={cn(
        'motion-rise relative min-w-0 overflow-hidden rounded-[var(--radius-card)] bg-card p-4 pt-5 shadow-card before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[var(--mod)] sm:p-5 sm:pt-6',
        className,
      )}
      style={accentStyle(accent)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2
          className="flex items-center gap-2 font-sans text-base font-extrabold text-selva"
          id={headingId}
        >
          {title}
          {count !== undefined && (
            <span className="rounded-full border border-border bg-muted px-2 font-sans text-xs font-bold text-muted-foreground">
              {count}
            </span>
          )}
        </h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

// Datos de un registro en dos niveles: la etiqueta pequeña y tenue, el valor firme.
export function KeyValues({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-5 gap-y-3 min-[420px]:grid-cols-2">
      {children}
    </dl>
  );
}

export function KeyValue({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-bold break-words text-foreground">
        {children}
      </dd>
    </div>
  );
}
