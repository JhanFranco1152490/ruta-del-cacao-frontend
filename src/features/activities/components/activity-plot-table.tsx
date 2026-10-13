import { Plus } from 'lucide-react';
import { Fragment } from 'react';

import { TONE_ICONS } from '@/components/status-badge';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import {
  formatMonthYear,
  formatWeekdayDate,
  monthDates,
  weekdayIndex,
} from '@/lib/format/dates';

import { canScheduleOn } from '../activity-actions';
import type { ActivityOfDay } from '../activity-days';
import { activityBadge, activityTitle } from '../activity-labels';
import type { FarmRows } from '../activity-plots';

const WEEKDAY_INITIAL = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const MARKER_CLASSES = {
  info: 'bg-info-bg text-info',
  warn: 'bg-warn-bg text-warn',
  err: 'bg-err-bg text-err',
  ok: 'bg-ok-bg text-ok',
} as const;

// Qué tan urgente es cada tono, para elegir el que representa a un día con varias actividades.
const URGENCY = { err: 3, warn: 2, info: 1, ok: 0 } as const;

function Marker({
  items,
  plotId,
  onSelect,
  onOpenDay,
}: {
  items: readonly ActivityOfDay[];
  plotId: string;
  onSelect: (item: ActivityOfDay) => void;
  onOpenDay: (date: string, plotId: string) => void;
  // Programar en una parcela un día sin actividad; sin él (sin permiso o sin conexión) no se ofrece.
  // Se hace con el puntero: con el teclado se usa **Programar actividad**.
  onSchedule?: (date: string, farmId: string, plotId: string) => void;
}) {
  const [first] = items;
  const { activity } = first;
  const day = formatWeekdayDate(activity.scheduled_date);
  const badges = items.map((item) => activityBadge(item));
  const worst = badges.reduce((a, b) =>
    URGENCY[b.tone] > URGENCY[a.tone] ? b : a,
  );
  const Icon = TONE_ICONS[worst.tone];
  const single = items.length === 1;
  const label = single
    ? `${activityTitle(activity)}, parcela ${activity.plot.code}, ${day}, ${badges[0].text}`
    : `${items.length} actividades, parcela ${activity.plot.code}, ${day}, la más urgente: ${worst.text}`;

  return (
    <button
      aria-label={label}
      className={`relative grid size-7 cursor-pointer place-items-center rounded-md ${MARKER_CLASSES[worst.tone]} ${FOCUS_OUTLINE_CLASS}`}
      onClick={() =>
        single ? onSelect(first) : onOpenDay(activity.scheduled_date, plotId)
      }
      title={label}
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
      {!single && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-selva text-[10px] font-extrabold text-primary-foreground"
        >
          {items.length}
        </span>
      )}
    </button>
  );
}

// Una fila por parcela, agrupadas por finca, y una columna por día del mes: se ve de un vistazo
// qué se le hizo y qué le falta a cada parcela. La columna de la parcela queda fija al desplazar.
export function ActivityPlotTable({
  month,
  today,
  farms,
  onSelect,
  onOpenDay,
  onSchedule,
}: {
  month: string;
  today: string;
  farms: readonly FarmRows[];
  onSelect: (item: ActivityOfDay) => void;
  // Un día de una parcela con varias actividades: se abre la lista de ese día para esa parcela.
  onOpenDay: (date: string, plotId: string) => void;
  // Programar en una parcela un día sin actividad; sin él (sin permiso o sin conexión) no se
  // ofrece. Se hace con el puntero: con el teclado se usa **Programar actividad**.
  onSchedule?: (date: string, farmId: string, plotId: string) => void;
}) {
  const days = monthDates(month);

  return (
    <div
      className="overflow-x-auto rounded-xl border border-border bg-card shadow-card"
      data-no-swipe=""
    >
      <table
        aria-label={`Actividades por parcela, ${formatMonthYear(month)}`}
        className="min-w-full border-collapse text-sm"
      >
        <thead>
          <tr className="bg-surface-alt">
            <th
              className="sticky left-0 z-10 min-w-36 bg-surface-alt px-3 py-2 text-left text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase"
              scope="col"
            >
              Parcela
            </th>
            {days.map((date) => {
              const weekday = weekdayIndex(date);
              const isToday = date === today;
              return (
                <th
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={formatWeekdayDate(date)}
                  className={`min-w-9 px-0.5 py-2 text-center text-[11px] font-extrabold ${
                    isToday
                      ? 'bg-cobre text-primary-foreground'
                      : weekday >= 5
                        ? 'text-muted-foreground'
                        : 'text-selva'
                  }`}
                  key={date}
                  scope="col"
                >
                  <span aria-hidden="true">
                    {WEEKDAY_INITIAL[weekday]}
                    <br />
                    {Number(date.slice(8))}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {farms.map((farm) => (
            <Fragment key={farm.farmId}>
              <tr className="bg-muted">
                <th
                  className="sticky left-0 px-3 py-1.5 text-left text-xs font-extrabold text-selva"
                  colSpan={days.length + 1}
                  scope="rowgroup"
                >
                  {farm.farmName}
                </th>
              </tr>
              {farm.plots.map(({ plot, activities }) => {
                const byDate = Map.groupBy(
                  activities,
                  (item) => item.activity.scheduled_date,
                );
                return (
                  <tr className="border-t border-border" key={plot.id}>
                    <th
                      className="sticky left-0 z-10 bg-card px-3 py-1.5 text-left font-extrabold text-selva"
                      scope="row"
                    >
                      {plot.code}
                      {!plot.is_active && (
                        <span className="ml-1 text-xs font-semibold text-muted-foreground">
                          (inactiva)
                        </span>
                      )}
                    </th>
                    {days.map((date) => {
                      const items = byDate.get(date);
                      const schedulable =
                        !items &&
                        !!onSchedule &&
                        plot.is_active &&
                        plot.farm.is_active &&
                        canScheduleOn(date, today);
                      return (
                        <td
                          className={`p-0.5 text-center ${schedulable ? 'group cursor-pointer hover:bg-muted' : ''}`}
                          key={date}
                          onClick={
                            schedulable
                              ? () => onSchedule(date, plot.farm.id, plot.id)
                              : undefined
                          }
                          title={
                            schedulable
                              ? `Programar una actividad en ${plot.code} el ${formatWeekdayDate(date)}`
                              : undefined
                          }
                        >
                          {schedulable && (
                            <Plus
                              aria-hidden="true"
                              className="mx-auto size-4 text-muted-foreground opacity-0 group-hover:opacity-100"
                            />
                          )}
                          {items && (
                            <Marker
                              items={items}
                              onOpenDay={onOpenDay}
                              onSelect={onSelect}
                              plotId={plot.id}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
