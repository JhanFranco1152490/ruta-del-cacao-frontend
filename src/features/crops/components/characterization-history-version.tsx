import { StatusBadge } from '@/components/status-badge';
import type { components } from '@/lib/api/schema';
import { formatDateTime } from '@/lib/format/dates';

import {
  describeChanges,
  type HistorySnapshot,
} from '../characterization-history';

type Event = components['schemas']['PlotCharacterizationEvent'];

const ACTION_LABELS: Record<Event['action'], string> = {
  created: 'Registrada',
  updated: 'Actualizada',
};

// Una versión de la ficha: cuándo se guardó, quién y qué cambió. `previous` es la versión anterior
// si ya se cargó; sin ella (la primera, o la última de las cargadas) se muestran los valores que
// tiene, porque no hay con qué compararla.
export function CharacterizationHistoryVersion({
  event,
  previous,
}: {
  event: Event;
  previous: HistorySnapshot | null;
}) {
  const lines = describeChanges(previous, event.snapshot);
  const comparison = previous !== null;

  return (
    <li className="space-y-3 rounded-(--radius) border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl text-selva">Versión {event.version}</h2>
        <StatusBadge tone={event.action === 'created' ? 'ok' : 'info'}>
          {ACTION_LABELS[event.action]}
        </StatusBadge>
      </div>
      <p className="text-sm text-muted-foreground">
        {formatDateTime(event.occurred_at)} · Guardada por{' '}
        {event.actor_name ?? 'Cuenta eliminada'}
      </p>
      {lines.length > 0 ? (
        <div>
          <p className="text-sm font-bold text-selva">
            {comparison ? 'Qué cambió' : 'Valores guardados'}
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm">
          {comparison
            ? 'Los valores no cambiaron.'
            : 'Esta versión no guardó valores.'}
        </p>
      )}
    </li>
  );
}
