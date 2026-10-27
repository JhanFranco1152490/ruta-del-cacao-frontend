'use client';

import { cn } from 'cn';
import { CalendarClock } from 'lucide-react';
import type { ReactNode } from 'react';

import { Tooltip } from '@/components/ui/tooltip';
import {
  dateInBogota,
  formatAbbreviatedDate,
  formatShortDateTime,
} from '@/lib/format/dates';

import { phText, temperatureText } from '@/lib/postharvest/measure-text';
import type { CardDetails } from './card-parts';

// Cada hito de la línea: un punto sobre la barra, con su dato al pasar el mouse o enfocarlo, y el
// mismo dato como nombre para el lector de pantalla.
function Marker({
  at,
  label,
  className,
  children,
}: {
  at: number;
  label: string;
  className: string;
  children?: ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <li
        aria-label={label}
        className={cn(
          'absolute top-1/2 z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-2 ring-card transition-transform outline-none before:absolute before:-inset-1.5 hover:scale-110 focus-visible:scale-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre',
          className,
        )}
        style={{ left: `${at}%` }}
        tabIndex={0}
      >
        {children}
      </li>
    </Tooltip>
  );
}

const shortDay = (iso: string) => formatAbbreviatedDate(dateInBogota(iso));

// La fermentación como línea de tiempo, en dos colores: el verde de lo que ya pasó (la barra hasta
// ahora y los volteos hechos) y el cobre de lo que falta o se atrasó (el próximo volteo, y el
// tramo de atraso si ya venció). Cada punto dice su fecha y su medición al pasar el mouse. Lo
// que dice la línea lo repite el texto de la tarjeta.
export function CardTimeline({ details }: { details: CardDetails }) {
  const { startedAt, next, timeline } = details;
  const { nowPercent, duePercent } = timeline;
  const labelsRight = duePercent > 70;
  return (
    <div className="mt-2 mb-6">
      <ol
        aria-label="Línea de tiempo de la fermentación"
        className="relative h-8 list-none"
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-muted"
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-selva"
          style={{ width: `${nowPercent}%` }}
        />
        {next.overdue ? (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-2 -translate-y-1/2 bg-cobre"
            style={{
              left: `${duePercent}%`,
              width: `${nowPercent - duePercent}%`,
            }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-0 -translate-y-1/2 border-t-2 border-dashed border-cobre"
            style={{
              left: `${nowPercent}%`,
              width: `${duePercent - nowPercent}%`,
            }}
          />
        )}
        <Marker
          at={0}
          className="size-4 bg-selva"
          label={`Inicio · ${formatShortDateTime(startedAt)}`}
        />
        {timeline.points.map((point) => (
          <Marker
            at={point.percent}
            className={cn(
              'size-7 text-xs font-bold',
              point.pending
                ? 'border-2 border-dashed border-cobre bg-card text-cobre'
                : 'bg-selva text-white',
            )}
            key={point.number}
            label={[
              `Volteo ${point.number}`,
              formatShortDateTime(point.at),
              `${temperatureText(point.temperature)} · pH ${phText(point.ph)}`,
              ...(point.pending ? ['Pendiente de enviar'] : []),
            ].join(' · ')}
          >
            {point.number}
          </Marker>
        ))}
        <Marker
          at={duePercent}
          className={cn(
            'size-7',
            next.overdue
              ? 'bg-cobre text-white'
              : 'border-2 border-dashed border-cobre bg-card text-cobre',
          )}
          label={next.text}
        >
          <CalendarClock aria-hidden="true" className="size-4" />
        </Marker>
      </ol>
      <div
        aria-hidden="true"
        className="relative h-4 text-[0.7rem] font-semibold"
      >
        <span className="absolute left-0 whitespace-nowrap text-muted-foreground">
          Inicio · {shortDay(startedAt)}
        </span>
        <span
          className={cn(
            'absolute whitespace-nowrap text-cobre',
            labelsRight ? '-translate-x-full' : '-translate-x-1/4',
          )}
          style={{ left: `${duePercent}%` }}
        >
          {next.overdue ? 'Pendiente' : 'Próximo'} · {shortDay(next.dueAt)}
        </span>
      </div>
    </div>
  );
}
