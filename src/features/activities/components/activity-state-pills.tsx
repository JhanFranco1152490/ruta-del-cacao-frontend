import { TONE_ICONS } from '@/components/status-badge';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';

import { ACTIVITY_STATE_DISPLAY, ACTIVITY_STATES } from '../activity-labels';
import type { ActivityState } from '../activity-state';
import type { StateCounts } from '../activity-summary';

const TONE_CLASSES = {
  info: 'border-info/30 bg-info-bg text-info',
  warn: 'border-warn/30 bg-warn-bg text-warn',
  err: 'border-err/30 bg-err-bg text-err',
  ok: 'border-ok/30 bg-ok-bg text-ok',
} as const;

// Cuántas actividades hay del periodo en cada estado, en una sola fila. Cada una es a la vez el
// recuento, la clave de colores del calendario y el filtro de estado: tocarla deja solo ese
// estado, y tocarla otra vez lo quita. El número va en texto y el ícono repite el del estado.
export function ActivityStatePills({
  counts,
  total,
  state,
  onState,
}: {
  counts: StateCounts;
  total: number;
  state: ActivityState | null;
  onState: (state: ActivityState | null) => void;
}) {
  return (
    <div
      aria-label="Estados del periodo"
      className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
      role="group"
    >
      {ACTIVITY_STATES.map((key) => {
        const { tone, label } = ACTIVITY_STATE_DISPLAY[key];
        const Icon = TONE_ICONS[tone];
        const selected = state === key;
        return (
          <button
            aria-pressed={selected}
            className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-bold ${TONE_CLASSES[tone]} ${
              selected
                ? 'ring-2 ring-selva ring-offset-1'
                : 'hover:brightness-95'
            } ${FOCUS_OUTLINE_CLASS}`}
            key={key}
            onClick={() => onState(selected ? null : key)}
            type="button"
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
            <span className="rounded-full bg-card/70 px-2 text-selva tabular-nums">
              {counts[key]}
            </span>
          </button>
        );
      })}
      <span className="shrink-0 px-1 text-sm font-semibold whitespace-nowrap text-muted-foreground">
        {total === 1 ? '1 actividad' : `${total} actividades`}
      </span>
    </div>
  );
}
