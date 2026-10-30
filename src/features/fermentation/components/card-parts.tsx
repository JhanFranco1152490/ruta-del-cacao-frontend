import { cn } from 'cn';
import { CalendarClock, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatShortDateTime } from '@/lib/format/dates';
import { farmLabel } from '@/lib/format/place-label';

import type { Fermentation } from '../api';
import type { cardDetails } from '../card-details';
import { phText, temperatureText } from '@/lib/postharvest/measure-text';

export type CardDetails = ReturnType<typeof cardDetails>;

// El código del lote y dónde está: lo primero que se lee de una tarjeta.
export function CardTitle({
  fermentation,
  aside,
}: {
  fermentation: Fermentation;
  // Algo a la derecha de la finca y el cajón (un sello de estado), sin apretar el código.
  aside?: ReactNode;
}) {
  const { lot, farm, facility } = fermentation;
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="font-mono font-bold break-all">{lot.code}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {farmLabel(farm)} · {facility.name}
        </p>
        {aside}
      </div>
    </div>
  );
}

// La última medición: «40,0 °C · pH 5,00», o que todavía no hay volteos.
export const lastMeasurement = (last: CardDetails['last']) =>
  last
    ? `${temperatureText(last.temperature)} · pH ${phText(last.ph)}`
    : 'Sin volteos todavía';

// De qué volteo es esa medición y cuándo se hizo.
export const lastTurnNote = (last: CardDetails['last']) =>
  last
    ? [
        `Volteo ${last.number}`,
        formatShortDateTime(last.at),
        ...(last.pending ? ['Pendiente de enviar'] : []),
      ].join(' · ')
    : null;

// El próximo volteo, o el que está atrasado: ícono y texto además del color.
export function NextTurnLine({ next }: { next: CardDetails['next'] }) {
  const Icon = next.overdue ? TriangleAlert : CalendarClock;
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-sm font-bold',
        next.overdue ? 'text-warn' : 'text-selva',
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {next.text}
    </p>
  );
}
