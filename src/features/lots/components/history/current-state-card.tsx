import { cn } from 'cn';
import { CircleDot } from 'lucide-react';

import { LotStatusBadge } from '@/components/lot-status-badge';

import type { LotHistory } from '../../api';
import { currentStateText } from '../../history/current-state-text';

// Cómo está el lote hoy, con su estado y, desde la bodega, lo que queda y lo vendido. No es una
// etapa: en pantallas anchas va en la columna fija de al lado de la línea de tiempo, y en celular
// al final de ella.
export function CurrentStateCard({
  current,
  className,
}: {
  current: LotHistory['current'];
  className?: string;
}) {
  return (
    <section
      aria-label="Estado actual"
      className={cn(
        'space-y-2 rounded-[var(--radius-card)] border-2 border-[var(--mod)] bg-card p-4',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <CircleDot aria-hidden="true" className="size-4 text-[var(--mod)]" />
        Hoy
      </div>
      <LotStatusBadge status={current.status} />
      <p className="font-bold">{currentStateText(current)}</p>
    </section>
  );
}
