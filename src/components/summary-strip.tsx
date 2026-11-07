import { cn } from 'cn';
import type { ReactNode } from 'react';

// Los totales de arriba de una lista, en una sola franja blanca con una línea entre uno y otro
// (apilados en celular), como las cifras de un detalle (`StatStrip`). Con `compact` quedan en una
// sola fila también en celular, con un texto más chico: para tres cifras cortas, que apiladas
// ocupaban casi una quinta parte de la pantalla.
export function SummaryStrip({
  label,
  compact = false,
  columns = 3,
  children,
}: {
  label: string;
  compact?: boolean;
  // Cuántas cifras caben en una fila desde `sm`: con cuatro, en celular pasan a dos filas de dos.
  columns?: 3 | 4;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(
        'group/strip grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-border shadow-card',
        columns === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3',
        compact
          ? columns === 4
            ? 'grid-cols-2'
            : 'grid-cols-3'
          : 'grid-cols-1',
      )}
      data-compact={compact ? '' : undefined}
    >
      {children}
    </section>
  );
}

export function SummaryItem({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-card p-3 group-data-[compact]/strip:max-sm:p-2.5 sm:p-4',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground group-data-[compact]/strip:max-sm:text-xs">
        {title}
      </p>
      {children}
    </div>
  );
}

// Una cifra de la franja, con una línea pequeña debajo si hace falta («187,5 kg»).
export function SummaryValue({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail?: string;
}) {
  return (
    <SummaryItem title={title}>
      <p className="text-xl font-bold text-selva tabular-nums sm:text-2xl">
        {value}
      </p>
      {detail && (
        <p className="text-xs text-muted-foreground tabular-nums">{detail}</p>
      )}
    </SummaryItem>
  );
}
