'use client';

import { cn } from 'cn';
import { Layers } from 'lucide-react';

import { formatDecimal } from '@/lib/format/decimal';
import {
  LOT_STATUS_ORDER,
  LOT_STATUSES,
  type LotStatus,
} from '@/lib/lot-status';

import type { LotStatusTotal } from '../api';

const ALL = 'all';

const lotsText = (count: number) => (count === 1 ? '1 lote' : `${count} lotes`);

const totalsText = (count: number, kilos: number) =>
  `${lotsText(count)} · ${formatDecimal(kilos, 1)} kg`;

// Cuántos lotes y kilos hay en cada estado, y a la vez el filtro de estado: tocar una tarjeta
// muestra solo esos lotes, y «Todos» los muestra todos. Mientras llega el recuento, o si falla, las
// tarjetas siguen sirviendo para filtrar.
export function LotStatusCards({
  totals,
  value,
  onChange,
}: {
  totals: readonly LotStatusTotal[] | undefined;
  value: LotStatus | undefined;
  onChange: (status: LotStatus | null) => void;
}) {
  const byStatus = new Map(totals?.map((total) => [total.status, total]));
  const allCount = totals?.reduce((sum, { count }) => sum + count, 0);
  const allKilos = totals?.reduce(
    (sum, { green_weight_kg }) => sum + Number(green_weight_kg),
    0,
  );
  const cards = [
    {
      key: ALL,
      label: 'Todos',
      Icon: Layers,
      detail:
        allCount === undefined
          ? undefined
          : totalsText(allCount, allKilos ?? 0),
    },
    ...LOT_STATUS_ORDER.map((status) => {
      const total = byStatus.get(status);
      return {
        key: status,
        label: LOT_STATUSES[status].label,
        Icon: LOT_STATUSES[status].Icon,
        detail: total
          ? totalsText(total.count, Number(total.green_weight_kg))
          : undefined,
      };
    }),
  ];
  const selected = value ?? ALL;

  return (
    <div
      aria-label="Estado"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      role="group"
    >
      {cards.map(({ key, label, Icon, detail }) => {
        const pressed = selected === key;
        return (
          <button
            aria-pressed={pressed}
            className={cn(
              'flex min-h-11 flex-col items-start gap-1 rounded-(--radius) border bg-card px-4 py-3 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre',
              pressed
                ? 'border-selva bg-selva text-white'
                : 'border-border text-foreground hover:bg-surface-alt',
            )}
            key={key}
            onClick={() => onChange(key === ALL ? null : (key as LotStatus))}
            type="button"
          >
            <span className="flex items-center gap-2 text-sm font-bold">
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </span>{' '}
            <span
              className={cn(
                'text-sm tabular-nums',
                pressed ? 'text-white' : 'text-muted-foreground',
              )}
            >
              {detail ?? '—'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
