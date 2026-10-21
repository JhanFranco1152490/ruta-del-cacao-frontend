import { cn } from 'cn';
import type { ReactNode } from 'react';

// Los totales de arriba de una lista. En pantallas anchas son tarjetas sueltas, una al lado de
// otra; en el celular se juntan en un solo recuadro con rayas entre una y otra, que ocupa un
// tercio menos de alto y deja la lista más arriba.
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
      className="grid grid-cols-1 gap-px overflow-hidden rounded-(--radius) border bg-border sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:border-0 sm:bg-transparent"
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
        'bg-card p-3 sm:rounded-(--radius) sm:border sm:p-4',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
