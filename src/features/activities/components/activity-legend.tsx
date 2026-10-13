import { Send } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';

import {
  ACTIVITY_STATE_DISPLAY,
  ACTIVITY_STATES,
  ACTIVITY_STATE_HINT,
  PENDING_COMPLETION_LABEL,
} from '../activity-labels';

// Qué significa cada estado, siempre a la vista al pie del calendario. Cada uno lleva su color,
// su ícono y su texto: ninguno se distingue solo por el color.
export function ActivityLegend() {
  return (
    <section aria-label="Leyenda de estados">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {ACTIVITY_STATES.map((state) => (
          <li className="flex items-center gap-2" key={state}>
            <StatusBadge tone={ACTIVITY_STATE_DISPLAY[state].tone}>
              {ACTIVITY_STATE_DISPLAY[state].label}
            </StatusBadge>
            <span>{ACTIVITY_STATE_HINT[state]}</span>
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-info px-2.5 py-1 text-xs font-bold text-info">
            <Send aria-hidden="true" className="size-4" />
            Pendiente de enviar
          </span>
          <span>{PENDING_COMPLETION_LABEL} cuando haya conexión.</span>
        </li>
      </ul>
    </section>
  );
}
