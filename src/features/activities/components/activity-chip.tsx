import { TONE_ICONS } from '@/components/status-badge';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';
import { formatWeekdayDate } from '@/lib/format/dates';

import { type ActivityOfDay, isAwaitingSync } from '../activity-days';
import { activityBadge, activityTitle } from '../activity-labels';
import { ActivityTypeIcon } from '../activity-type-icons';

// El filo y el fondo repiten el tono del estado, que ya dicen el ícono y el texto.
const TONE_CLASSES = {
  info: 'border-l-info bg-info-bg',
  warn: 'border-l-warn bg-warn-bg',
  err: 'border-l-err bg-err-bg',
  ok: 'border-l-ok bg-ok-bg',
} as const;

// La ficha de una actividad en una celda del calendario: la labor (en negrita, es lo que se busca
// con la vista) con su ícono, la parcela y el estado con el suyo. Tocarla abre su detalle. Su nombre accesible lo dice todo junto.
export function ActivityChip({
  item,
  onSelect,
  tabIndex,
}: {
  item: ActivityOfDay;
  onSelect: () => void;
  // Dentro de la cuadrícula la celda es la única parada del teclado y la ficha se alcanza desde
  // el diálogo del día: allí va -1.
  tabIndex?: number;
}) {
  const { activity } = item;
  const { tone, text } = activityBadge(item);
  const StateIcon = TONE_ICONS[tone];
  const title = activityTitle(activity);

  return (
    <button
      aria-label={`${title}, parcela ${activity.plot.code}, ${formatWeekdayDate(activity.scheduled_date)}, ${text}`}
      className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-md border-l-4 px-1.5 py-1 text-left text-xs text-selva hover:brightness-95 ${TONE_CLASSES[tone]} ${isAwaitingSync(item) ? 'border-dashed' : ''} ${FOCUS_OUTLINE_CLASS}`}
      onClick={onSelect}
      tabIndex={tabIndex}
      type="button"
    >
      <span className="flex items-start gap-1">
        <ActivityTypeIcon
          className="mt-px size-3.5 shrink-0"
          type={activity.activity_type}
        />
        <span className="flex min-w-0 flex-wrap gap-x-1.5">
          <span className="font-extrabold break-words">{title}</span>
          <span className="font-semibold">{activity.plot.code}</span>
        </span>
      </span>
      <span className="flex items-start gap-1 font-semibold">
        <StateIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        {text}
      </span>
    </button>
  );
}
