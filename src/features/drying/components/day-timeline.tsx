'use client';

import { cn } from 'cn';

import { Tooltip } from '@/components/ui/tooltip';

import type { cardDetails, DayStatus } from '../drying-list';

type Day = ReturnType<typeof cardDetails>['days'][number];

const DOT_CLASS: Record<DayStatus, string> = {
  logged: 'bg-selva text-white',
  queued: 'border-2 border-dashed border-cobre bg-card text-cobre',
  today:
    'border-2 border-dashed border-cobre bg-card text-cobre ring-2 ring-cobre/30',
  missing: 'border-2 border-dashed border-border bg-card text-muted-foreground',
};

// Un punto por día de secado: lleno si tiene bitácora, punteado si no, y hoy con un halo. Cada punto
// dice su fecha y su humedad al pasar el mouse o enfocarlo, y lleva el mismo dato como nombre para
// el lector de pantalla. Lo que dice la línea lo repite el texto de la tarjeta.
export function DayTimeline({ days }: { days: readonly Day[] }) {
  return (
    <ol
      aria-label="Días del secado"
      className="flex list-none flex-wrap items-center gap-x-1 gap-y-2 py-1"
    >
      {days.map((day) => (
        <Tooltip key={day.day} label={day.label}>
          <li
            aria-label={day.label}
            className={cn(
              'relative grid size-7 place-items-center rounded-full text-xs font-bold transition-transform outline-none before:absolute before:-inset-1 hover:scale-110 focus-visible:scale-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre',
              DOT_CLASS[day.status],
            )}
            tabIndex={0}
          >
            {day.day}
          </li>
        </Tooltip>
      ))}
    </ol>
  );
}
