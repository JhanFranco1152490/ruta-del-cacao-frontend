import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { type ModuleAccent, accentStyle } from './accent';

// Las cifras de una pantalla en una sola franja blanca, en celdas pegadas con una línea entre
// ellas (dos por fila en celular, cuatro en pantallas anchas). Va suelta, debajo de la cabecera.
export function StatStrip({
  label,
  accent,
  children,
}: {
  label: string;
  accent: ModuleAccent;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] bg-border shadow-card lg:grid-cols-4"
      style={accentStyle(accent)}
    >
      {children}
    </section>
  );
}

export function StatCell({
  icon: Icon,
  label,
  value,
  note,
  percentage,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  note?: string;
  // Cuánto de algo está cubierto: una barra bajo el valor.
  percentage?: number;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 bg-card p-3 sm:p-4">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--mod-tint)] text-[var(--mod)]"
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <p className="font-serif text-2xl leading-tight break-words text-selva tabular-nums">
          {value}
        </p>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {percentage !== undefined && (
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--mod)]"
              style={{
                width: `${Math.min(100, percentage > 0 ? Math.max(percentage, 2) : 0)}%`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
