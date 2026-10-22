import { cn } from 'cn';
import type { ReactNode } from 'react';

// Los totales de arriba de una lista, en una sola franja blanca con una línea entre uno y otro
// (apilados en celular), como las cifras de un detalle (`StatStrip`).
export function SummaryStrip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-1 gap-px overflow-hidden rounded-[var(--radius-card)] bg-border shadow-card sm:grid-cols-3"
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
    <div className={cn('bg-card p-3 sm:p-4', className)}>
      <p className="text-sm text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
