'use client';

import { ChevronDown, Images } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';

import { accentStyle } from '@/components/page-blocks/accent';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { formatShortWeekdayDate } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { detectionName } from '../detection-status';
import type { HistoryRow } from '../history-rows';
import { unitName } from '../monitoring-rules';
import { DetectionActions } from './detection-actions';
import { ControlCell, MonitoringDetail } from './monitoring-result-parts';

// Desde `xl` cada detección va en una fila de cuatro columnas: lo encontrado y la incidencia con
// ancho fijo (así las barras quedan alineadas entre filas y entre tarjetas, tengan o no
// acciones), el control con lo que sobra y las acciones al final. Por debajo se apila y las
// acciones van en «⋯».
const WIDE_QUERY = '(min-width: 1280px)';
const canMeasure = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function';
const subscribeWide = (onChange: () => void) => {
  if (!canMeasure()) return () => undefined;
  const media = window.matchMedia(WIDE_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
const useIsWide = () =>
  useSyncExternalStore(
    subscribeWide,
    () => canMeasure() && window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );

const ROW_GRID =
  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-2 xl:grid-cols-[17rem_13rem_minmax(0,1fr)_auto]';

// Un monitoreo del historial como tarjeta: la fecha, la parcela y quién lo registró una sola vez
// arriba, y cada plaga encontrada con su incidencia en grande. La barra solo sigue el porcentaje:
// no hay umbrales de alerta definidos.
function MonitoringCard({ rows }: { rows: readonly HistoryRow[] }) {
  const [open, setOpen] = useState(false);
  const { activity, date } = rows[0];
  const photos = activity.monitoring?.evidence_count ?? 0;
  const { data: user } = useSession();
  const isWide = useIsWide();
  const canAct = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD);
  const unit = activity.monitoring?.sampling_unit;
  return (
    <article
      aria-label={`Monitoreo del ${formatShortWeekdayDate(date)} en ${activity.plot.code}`}
      className="relative overflow-hidden rounded-[var(--radius-card)] bg-card pl-1 shadow-card before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--mod)]"
    >
      <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border px-4 py-2.5">
        <span className="font-extrabold text-[var(--mod)] first-letter:uppercase">
          {formatShortWeekdayDate(date)}
        </span>
        <span className="font-bold">
          {activity.plot.code} · {activity.plot.farm.name}
        </span>
        {activity.completed_by && (
          <span className="text-sm text-muted-foreground">
            Registró {activity.completed_by.full_name}
          </span>
        )}
        <Button
          aria-expanded={open}
          className="ml-auto h-9 text-sm"
          onClick={() => setOpen((value) => !value)}
          type="button"
          variant="outline"
        >
          <ChevronDown
            aria-hidden="true"
            className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
          Detalle
          {photos > 0 && (
            <span className="inline-flex items-center gap-1 font-normal">
              <Images aria-hidden="true" className="size-4" />
              {photos}
              <span className="sr-only"> fotos</span>
            </span>
          )}
        </Button>
      </header>
      <ul className="divide-y divide-border">
        {rows.map(({ key, detection }) => {
          if (!detection) {
            return (
              <li className="flex items-center gap-3 px-4 py-3" key={key}>
                <StatusBadge tone="ok">Sin presencia</StatusBadge>
                <span className="text-sm text-muted-foreground">
                  No se encontraron plagas ni enfermedades.
                </span>
              </li>
            );
          }
          const incidence = Math.min(100, Number(detection.incidence));
          return (
            <li className={`${ROW_GRID} px-4 py-3`} key={key}>
              <div className="min-w-0">
                <p className="font-bold break-words">
                  {detectionName(detection)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {detection.affected_units}{' '}
                  {unit ? unitName(unit, detection.affected_units) : ''} con
                  presencia
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-3 xl:col-span-1">
                <span className="shrink-0 font-serif text-3xl leading-none text-[var(--mod)] tabular-nums xl:w-[4.5rem] xl:text-right">
                  {formatDecimal(detection.incidence, 0)} %
                </span>
                <span
                  aria-hidden="true"
                  className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full bg-[var(--mod)]"
                    style={{
                      width: `${incidence > 0 ? Math.max(incidence, 2) : 0}%`,
                    }}
                  />
                </span>
              </div>
              <div className="col-span-2 min-w-0 text-sm xl:col-span-1">
                <ControlCell detection={detection} />
              </div>
              <div className="col-start-2 row-start-1 flex justify-end xl:col-start-auto xl:row-start-auto">
                {canAct && detection.controls.length === 0 && (
                  <DetectionActions
                    compact
                    detection={detection}
                    menu={!isWide}
                    monitoring={activity}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {open && (
        <div className="border-t border-border px-4 py-2">
          <MonitoringDetail activity={activity} />
        </div>
      )}
    </article>
  );
}

export function HistoryCards({ rows }: { rows: readonly HistoryRow[] }) {
  const groups: HistoryRow[][] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last[0].activity.id === row.activity.id) last.push(row);
    else groups.push([row]);
  }
  return (
    <div
      aria-label="Monitoreos"
      className="grid gap-3"
      role="list"
      style={accentStyle('cacao')}
    >
      {groups.map((group) => (
        <div key={group[0].activity.id} role="listitem">
          <MonitoringCard rows={group} />
        </div>
      ))}
    </div>
  );
}
