import { EmptyState } from '@/components/empty-state';

import type { ActivityOfDay } from '../activity-days';
import type { PendingGroup } from '../activity-pending';
import { ActivityCard } from './activity-card';
import { ActivityPendingDays } from './activity-pending-days';

// Lo que pide atención ya: vencidas, retrasadas, lo de hoy y lo de los próximos días, que la
// persona elige. Solo salen los grupos que tienen algo, de lo más urgente a lo que viene. Los días
// se eligen en la fila del título del primer grupo, a su derecha, o encima del aviso de que todo
// está al día: así el control no gasta una fila y siempre está a la vista.
export function ActivityPendingView({
  groups,
  days,
  onDays,
  onSelect,
}: {
  groups: readonly PendingGroup[];
  // Cuántos días hacia adelante cuenta y cómo cambiarlos.
  days: number;
  onDays: (days: number) => void;
  onSelect: (item: ActivityOfDay) => void;
}) {
  const withItems = groups.filter(({ items }) => items.length > 0);
  const daysControl = <ActivityPendingDays days={days} onDays={onDays} />;

  return (
    <div>
      {withItems.length === 0 ? (
        <>
          <div className="flex justify-end">{daysControl}</div>
          <EmptyState
            description={`No hay labores vencidas, retrasadas ni por hacer en los próximos ${days} días.`}
            title="Todo al día"
          />
        </>
      ) : (
        <div className="space-y-8">
          {withItems.map(({ key, label, items }, index) => (
            <section aria-labelledby={`pending-${key}`} key={key}>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h3
                  className="flex items-center gap-2 font-sans text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase"
                  id={`pending-${key}`}
                >
                  {label}{' '}
                  <span className="rounded-full bg-muted px-2 py-0.5 tracking-normal text-selva">
                    {items.length}
                  </span>
                </h3>
                {index === 0 && daysControl}
              </div>
              <ul className="mt-3 space-y-3">
                {items.map((item) => (
                  <li key={item.activity.id}>
                    <ActivityCard item={item} onSelect={() => onSelect(item)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
