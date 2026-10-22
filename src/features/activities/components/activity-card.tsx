import { StatusBadge } from '@/components/status-badge';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';

import { type ActivityOfDay, isAwaitingSync } from '../activity-days';
import { activityBadge, activityTitle } from '../activity-labels';
import { useAssigneeNote } from '../assignees';

// El borde repite el tono del estado, que ya dicen el ícono y el texto de la etiqueta.
const BORDER_BY_TONE = {
  info: 'border-l-info',
  warn: 'border-l-warn',
  err: 'border-l-err',
  ok: 'border-l-ok',
} as const;

// Una actividad en la lista: la labor, dónde es, quién la hace y cómo va. Tocarla abre su detalle.
export function ActivityCard({
  item,
  onSelect,
}: {
  item: ActivityOfDay;
  onSelect: () => void;
}) {
  const { activity } = item;
  const { tone, text } = activityBadge(item);
  const { plot, assignee } = activity;
  const note = useAssigneeNote(activity);

  return (
    <button
      className={`flex w-full cursor-pointer flex-col gap-2 rounded-xl border-l-[5px] bg-card px-4 py-3 text-left shadow-card hover:bg-muted sm:flex-row sm:items-center sm:justify-between ${BORDER_BY_TONE[tone]} ${isAwaitingSync(item) ? 'border-dashed' : ''} ${FOCUS_OUTLINE_CLASS}`}
      onClick={onSelect}
      type="button"
    >
      <span className="block min-w-0 space-y-1">
        <span className="block font-sans text-base font-extrabold text-selva">
          {activityTitle(activity)}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-muted-foreground">
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-extrabold whitespace-nowrap text-selva">
            {plot.code}
          </span>
          <span>{plot.farm.name}</span>
          <span aria-hidden="true" className="max-sm:hidden">
            ·
          </span>
          <span className="max-sm:basis-full">
            {assignee.full_name}
            {note && ` (${note.toLowerCase()})`}
          </span>
        </span>
      </span>
      <span className="shrink-0">
        <StatusBadge tone={tone}>{text}</StatusBadge>
      </span>
    </button>
  );
}
