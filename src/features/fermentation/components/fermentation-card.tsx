import { cn } from 'cn';
import { CalendarClock, Eye, RotateCw, TriangleAlert } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';
import { farmLabel } from '@/lib/format/place-label';

import type { Fermentation } from '../api';
import { cardFacts } from '../fermentation-list';
import { turnPath } from '../fermentation-paths';
import { FinishFermentationButton } from './finish-fermentation-button';
import type { QueuedTurn } from '../turn-queue';

// Un lote en fermentación: dónde está, cuánto lleva, su último volteo y cuándo toca el siguiente.
// Un volteo atrasado lleva ícono y texto además del color.
export function FermentationCard({
  fermentation,
  now,
  queued,
  lotHref,
  canManage,
  online,
}: {
  fermentation: Fermentation;
  now: Date;
  // Los volteos que siguen en la cola del teléfono, de cualquier lote.
  queued: readonly QueuedTurn[];
  lotHref: (id: string) => string;
  // Finalizar es de quien responde por la fermentación y necesita conexión: libera el cajón.
  canManage: boolean;
  online: boolean;
}) {
  const { lot, farm, facility } = fermentation;
  const facts = cardFacts(fermentation, now, queued);
  const NextIcon = facts.next.overdue ? TriangleAlert : CalendarClock;

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
      <div className="space-y-1">
        <p className="font-mono font-bold break-all">{lot.code}</p>
        <p className="text-sm text-muted-foreground">
          {farmLabel(farm)} · {facility.name}
        </p>
      </div>
      <div className="space-y-1 text-sm">
        <p>{facts.elapsed}</p>
        <p>{facts.lastTurn ?? 'Sin volteos todavía'}</p>
        <p
          className={cn(
            'flex items-center gap-1.5 font-bold',
            facts.next.overdue ? 'text-warn' : 'text-selva',
          )}
        >
          <NextIcon aria-hidden="true" className="size-4 shrink-0" />
          {facts.next.text}
        </p>
      </div>
      {/* Registrar volteo es lo principal; Finalizar se hace una vez por lote, pero desde aquí y no
          desde su ficha; ver el lote es un atajo de icono. Los tres en una sola fila, también en
          celular. */}
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <EditorLink
          className={cn(
            buttonVariants({ size: 'office' }),
            'max-sm:flex-1 max-sm:px-3',
          )}
          href={turnPath(lot.id)}
        >
          <RotateCw aria-hidden="true" className="size-4 max-[400px]:hidden" />{' '}
          Registrar volteo
        </EditorLink>
        {canManage && (
          <FinishFermentationButton
            fermentation={fermentation}
            inRow
            online={online}
            queued={queued}
          />
        )}
        <EditorLink
          aria-label={`Ver el lote ${lot.code}`}
          className={cn(
            buttonVariants({ variant: 'action', size: 'office' }),
            'px-3',
          )}
          href={lotHref(lot.id)}
        >
          <Eye aria-hidden="true" className="size-4" />
        </EditorLink>
      </div>
    </li>
  );
}
