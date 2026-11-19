import { CircleDot } from 'lucide-react';

import { LotStatusBadge } from '@/components/lot-status-badge';

import type { LotHistory } from '../../api';
import { currentStateText } from '../../history/current-state-text';

// La última entrada: no es una etapa sino cómo está el lote hoy, con su estado y, desde la bodega,
// lo que queda y lo vendido.
export function CurrentStateEntry({
  current,
}: {
  current: LotHistory['current'];
}) {
  return (
    <li
      aria-label="Estado actual"
      className="grid grid-cols-1 gap-1.5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-4"
    >
      <p className="text-sm font-semibold text-muted-foreground md:pt-2.5 md:text-right">
        Hoy
      </p>
      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--mod)] text-white"
        >
          <CircleDot className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-2 rounded-[var(--radius-card)] border-2 border-[var(--mod)] bg-card p-4">
          <LotStatusBadge status={current.status} />
          <p className="font-bold">{currentStateText(current)}</p>
        </div>
      </div>
    </li>
  );
}
