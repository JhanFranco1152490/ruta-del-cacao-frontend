import { EmptyState } from '@/components/empty-state';

import type { ActivityOfDay } from '../activity-days';
import type { PendingGroup } from '../activity-pending';
import { ActivityCard } from './activity-card';

// Lo que pide atención ya: vencidas, retrasadas, lo de hoy y lo de los próximos días, que la
// persona elige. Solo salen los grupos que tienen algo, de lo más urgente a lo que viene.
export function ActivityPendingView({
  groups,
  days,
  onSelect,
}: {
  groups: readonly PendingGroup[];
  // Los días que cuenta, solo para decirlo cuando no hay nada.
  days: number;
  onSelect: (item: ActivityOfDay) => void;
}) {
  const withItems = groups.filter(({ items }) => items.length > 0);

  return (
    <div>
      {withItems.length === 0 ? (
        <EmptyState
          description={`No hay labores vencidas, retrasadas ni por hacer en los próximos ${days} días.`}
          title="Todo al día"
        />
      ) : (
        <div className="space-y-8">
          {withItems.map(({ key, label, items }) => (
            <section aria-labelledby={`pending-${key}`} key={key}>
              <h3
                className="flex items-center gap-2 font-sans text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase"
                id={`pending-${key}`}
              >
                {label}{' '}
                <span className="rounded-full bg-muted px-2 py-0.5 tracking-normal text-selva">
                  {items.length}
                </span>
              </h3>
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
