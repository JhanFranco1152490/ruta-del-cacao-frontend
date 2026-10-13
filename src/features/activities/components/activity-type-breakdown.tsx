import type { TypeCount } from '../activity-summary';
import { ActivityTypeIcon } from '../activity-type-icons';

// Cuántas labores hay de cada tipo en el periodo, de la más frecuente a la menos. Va recogido: es
// un dato para mirar de vez en cuando y no debe ocupar el lugar del calendario. Las barras solo
// acompañan al número, que va siempre en texto.
export function ActivityTypeBreakdown({
  rows,
}: {
  rows: readonly TypeCount[];
}) {
  if (rows.length === 0) return null;
  const most = Math.max(...rows.map(({ count }) => count));

  return (
    <details className="rounded-xl border border-border bg-card px-4 py-2">
      <summary className="cursor-pointer text-sm font-bold text-selva">
        Por tipo de labor
      </summary>
      <ul aria-label="Por tipo de labor" className="mt-3 space-y-2 pb-1">
        {rows.map(({ type, label, count }) => (
          <li className="flex items-center gap-3 text-sm" key={type}>
            <ActivityTypeIcon
              className="size-4 shrink-0 text-muted-foreground"
              type={type}
            />
            <span className="w-48 shrink-0 font-semibold">{label}</span>
            <span
              aria-hidden="true"
              className="h-2 rounded-full bg-selva"
              style={{ width: `${(count / most) * 100}%`, minWidth: 6 }}
            />
            <span className="ml-auto font-extrabold text-selva">{count}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
