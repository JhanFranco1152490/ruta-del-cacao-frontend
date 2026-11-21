import { cn } from 'cn';
import { type ReactNode, useContext } from 'react';

import type { LotHistoryStage } from '../../api';
import { HISTORY_ICONS } from '../../history/history-icons';
import { stageTitle } from '../../history/stage-title';
import { stageDateText } from '../../history/stage-when';
import { HistoryPositionContext } from './history-anchor';

// Una entrada de la línea de tiempo: el ícono de la etapa sobre una línea que la une con la
// siguiente, y una tarjeta con su título, su fecha y sus datos. Un descarte marca el ícono en rojo;
// el texto que lo explica lo pone cada etapa, porque el color solo no basta. La tarjeta es un
// contenedor: con ancho suficiente sus datos se reparten en tres columnas.
export function HistoryEntry({
  stage,
  tone = 'default',
  badge,
  footer,
  children,
}: {
  stage: LotHistoryStage;
  tone?: 'default' | 'err';
  badge?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const Icon = HISTORY_ICONS[stage.kind];
  const title = stageTitle(stage);
  const { anchorId, active } = useContext(HistoryPositionContext);
  const err = tone === 'err';
  return (
    // La página ya reserva 5 rem arriba al desplazarse; este margen suma lo que ocupa la fila fija
    // de íconos, para que la etapa a la que se salta quede justo debajo de ella.
    <li
      aria-label={title}
      className="group flex scroll-mt-12 gap-3"
      id={anchorId}
    >
      <div className="flex shrink-0 flex-col items-center">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 items-center justify-center rounded-full border-2',
            err ? 'border-err' : 'border-[var(--mod)]',
            active
              ? cn('text-white', err ? 'bg-err' : 'bg-[var(--mod)]')
              : cn('bg-card', err ? 'text-err' : 'text-[var(--mod)]'),
          )}
        >
          <Icon className="size-5" />
        </span>
        <span
          aria-hidden="true"
          className="mt-1 w-0.5 flex-1 rounded-full bg-border group-last:hidden"
        />
      </div>
      <div className="min-w-0 flex-1 pb-4 group-last:pb-0">
        <div
          className={cn(
            '@container min-w-0 space-y-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card @2xl:[&_dl]:grid-cols-3',
            'transition-shadow',
            active && (err ? 'ring-2 ring-err' : 'ring-2 ring-[var(--mod)]'),
          )}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-serif text-lg leading-tight">{title}</h3>
            {badge}
            <p className="text-sm font-semibold text-muted-foreground sm:ml-auto">
              {stageDateText(stage)}
            </p>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </li>
  );
}
