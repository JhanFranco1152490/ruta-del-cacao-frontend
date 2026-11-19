import { cn } from 'cn';
import type { ReactNode } from 'react';

import type { LotHistoryStage } from '../../api';
import { HISTORY_ICONS } from '../../history/history-icons';
import { stageTitle } from '../../history/stage-title';
import { stageDateText } from '../../history/stage-when';

// Una entrada de la línea de tiempo: la fecha a la izquierda en escritorio (arriba en celular), el
// ícono de la etapa sobre la línea y una tarjeta con su título y sus datos. Un descarte marca el
// ícono en rojo; el texto que lo explica lo pone cada etapa, porque el color solo no basta.
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
  return (
    <li
      aria-label={title}
      className="grid grid-cols-1 gap-1.5 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-4"
    >
      <p className="text-sm font-semibold text-muted-foreground md:pt-2.5 md:text-right">
        {stageDateText(stage)}
      </p>
      <div className="flex min-w-0 gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full border-2 bg-card',
            tone === 'err'
              ? 'border-err text-err'
              : 'border-[var(--mod)] text-[var(--mod)]',
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg leading-tight">{title}</h3>
            {badge}
          </div>
          {children}
          {footer}
        </div>
      </div>
    </li>
  );
}
