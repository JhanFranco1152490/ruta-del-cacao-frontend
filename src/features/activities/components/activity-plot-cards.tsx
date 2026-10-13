import type { ActivityOfDay } from '../activity-days';
import type { FarmRows } from '../activity-plots';
import { ActivityCard } from './activity-card';

// La vista por parcela en una pantalla angosta: una tarjeta por parcela, bajo su finca, con sus
// actividades en orden. La tabla de escritorio no cabe en un celular.
export function ActivityPlotCards({
  farms,
  onSelect,
}: {
  farms: readonly FarmRows[];
  onSelect: (item: ActivityOfDay) => void;
}) {
  return (
    <div className="space-y-6">
      {farms.map((farm) => (
        <section aria-labelledby={`farm-${farm.farmId}`} key={farm.farmId}>
          <h3
            className="font-sans text-xs font-extrabold tracking-[0.12em] text-muted-foreground uppercase"
            id={`farm-${farm.farmId}`}
          >
            {farm.farmName}
          </h3>
          <div className="mt-3 space-y-4">
            {farm.plots.map(({ plot, activities }) => (
              <article
                aria-labelledby={`plot-${plot.id}`}
                className="space-y-3 rounded-xl border border-border bg-muted/40 p-3"
                key={plot.id}
              >
                <header className="flex items-baseline justify-between gap-3">
                  <h4
                    className="font-sans text-base font-extrabold text-selva"
                    id={`plot-${plot.id}`}
                  >
                    {plot.code}
                    {!plot.is_active && (
                      <span className="ml-1 text-xs font-semibold text-muted-foreground">
                        (inactiva)
                      </span>
                    )}
                  </h4>
                  <span className="text-sm text-muted-foreground">
                    {activities.length === 1
                      ? '1 actividad'
                      : `${activities.length} actividades`}
                  </span>
                </header>
                <ul className="space-y-2">
                  {activities.map((item) => (
                    <li key={item.activity.id}>
                      <ActivityCard
                        item={item}
                        onSelect={() => onSelect(item)}
                      />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
