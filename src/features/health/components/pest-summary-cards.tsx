import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { SectionCard } from '@/components/page-blocks/section-card';
import { StatusBadge } from '@/components/status-badge';
import { formatDayMonth } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';

import type { PestSummary } from '../history-api';
import { SAMPLING_UNITS } from '../monitoring-rules';

const nameOf = (row: PestSummary) =>
  row.pest_disease?.name ?? `Otra (${row.other_description})`;

// Si la plaga sube o baja frente al monitoreo anterior del mismo tipo de muestreo, en puntos de
// porcentaje. Subir es lo que preocupa: va en el tono de error; bajar, en el de bien.
function Trend({ row }: { row: PestSummary }) {
  if (row.previous_incidence === null) {
    return <StatusBadge tone="info">Primer registro</StatusBadge>;
  }
  const change = Number(row.latest_incidence) - Number(row.previous_incidence);
  const points = formatDecimal(String(Math.abs(change)), 1);
  if (change > 0) {
    return (
      <StatusBadge icon={TrendingUp} tone="err">
        Sube {points} puntos
      </StatusBadge>
    );
  }
  if (change < 0) {
    return (
      <StatusBadge icon={TrendingDown} tone="ok">
        Baja {points} puntos
      </StatusBadge>
    );
  }
  return (
    <StatusBadge icon={Minus} tone="info">
      Sin cambio
    </StatusBadge>
  );
}

function Bar({ label, value }: { label: string; value: string }) {
  const width = Math.min(100, Number(value));
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-[var(--mod)]"
          style={{ width: `${width > 0 ? Math.max(width, 2) : 0}%` }}
        />
      </span>
      <span className="text-right tabular-nums">
        {formatDecimal(value, 0)} %
      </span>
    </div>
  );
}

// El resumen por plaga: una ficha por plaga con la última incidencia en grande, si sube
// o baja y las dos barras para comparar. Solo con una parcela elegida (comparar parcelas distintas
// no dice si una plaga sube o baja).
export function PestSummaryCards({
  summary,
}: {
  summary: readonly PestSummary[];
}) {
  if (summary.length === 0) return null;
  return (
    <SectionCard accent="cacao" title="Resumen por plaga">
      <p className="-mt-2 mb-3 text-sm text-muted-foreground">
        La última incidencia de cada plaga en esta parcela frente a la anterior.
      </p>
      <ul
        aria-label="Resumen por plaga"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {summary.map((row) => (
          <li
            className="grid gap-2 rounded-xl border border-border p-3"
            key={`${row.pest_disease?.id ?? row.other_description}-${row.sampling_unit}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="min-w-0 font-bold break-words">{nameOf(row)}</p>
              <Trend row={row} />
            </div>
            <p className="flex items-baseline gap-2">
              <span className="font-serif text-3xl leading-none text-[var(--mod)] tabular-nums">
                {formatDecimal(row.latest_incidence, 0)} %
              </span>
              <span className="text-sm text-muted-foreground">
                de {SAMPLING_UNITS[row.sampling_unit].plural} ·{' '}
                {formatDayMonth(row.latest_date)}
              </span>
            </p>
            <div className="grid gap-1">
              <Bar label="Ahora" value={row.latest_incidence} />
              {row.previous_incidence !== null && (
                <Bar label="Antes" value={row.previous_incidence} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
