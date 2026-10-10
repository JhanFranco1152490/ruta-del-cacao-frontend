import { StatusBadge } from '@/components/status-badge';
import { formatLongDate } from '@/lib/format/dates';

import type { InputMovement } from '../api';
import {
  describeMovementAmount,
  MOVEMENT_KIND_LABELS,
} from '../movement-format';

const TONES = {
  entry: 'ok',
  count: 'info',
  consumption: 'warn',
} as const;

// Un movimiento: cuándo ocurrió, qué fue, cuánto cambió, quién lo registró y su nota.
export function InputMovementItem({
  movement,
  unit,
}: {
  movement: InputMovement;
  unit: string;
}) {
  return (
    <li className="space-y-2 rounded-(--radius) border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={TONES[movement.kind] ?? 'info'}>
          {MOVEMENT_KIND_LABELS[movement.kind] ?? movement.kind}
        </StatusBadge>
        <span className="text-lg font-bold text-selva">
          {describeMovementAmount(movement, unit)}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        {formatLongDate(movement.occurred_on)} · Registrado por{' '}
        {movement.actor_name ?? 'Cuenta eliminada'}
      </p>
      {movement.note && <p className="text-sm">{movement.note}</p>}
    </li>
  );
}
