import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatWeekdayDate } from '@/lib/format/dates';

import type { ActivityOfDay } from '../activity-days';
import { ActivityCard } from './activity-card';

// Las actividades del día elegido en la cuadrícula compacta del mes: lo que el celular no puede
// mostrar dentro de las celdas. Con `onSchedule` ofrece programar en ese día.
export function ActivityDayAgenda({
  date,
  isToday,
  items,
  onSelect,
  onSchedule,
}: {
  date: string;
  isToday: boolean;
  items: readonly ActivityOfDay[];
  onSelect: (item: ActivityOfDay) => void;
  // Sin él (sin permiso, sin conexión o un día pasado) no se ofrece.
  onSchedule?: (date: string) => void;
}) {
  return (
    <section aria-labelledby="day-agenda-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="flex flex-wrap items-center gap-2 font-sans text-sm font-extrabold text-selva first-letter:uppercase"
            id="day-agenda-title"
          >
            {formatWeekdayDate(date)}
            {isToday && (
              <span className="rounded-full bg-cobre px-2 py-0.5 text-xs tracking-[0.08em] text-primary-foreground uppercase">
                Hoy
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            {items.length === 0
              ? 'Sin actividades este día'
              : items.length === 1
                ? '1 actividad'
                : `${items.length} actividades`}
          </p>
        </div>
        {onSchedule && (
          <Button
            className="h-10 shrink-0"
            onClick={() => onSchedule(date)}
            size="office"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" />
            Programar
          </Button>
        )}
      </div>
      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.activity.id}>
              <ActivityCard item={item} onSelect={() => onSelect(item)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
