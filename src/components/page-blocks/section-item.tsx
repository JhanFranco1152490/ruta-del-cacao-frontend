import { cn } from 'cn';
import type { ReactNode } from 'react';

import { type ModuleAccent, accentStyle } from './accent';

// Dónde va una etapa respecto de la del lote: las anteriores ya se hicieron y las siguientes esperan.
export type SectionStage = 'done' | 'current' | 'pending';

// Una sección que se elige de una lista: `item` es su renglón en la lista (título, en qué va y su
// resumen) y `panel` es su contenido, que solo se pinta si es la elegida. La misma sección se monta
// una vez de cada forma, así que lo que lee lo comparte la caché de las consultas.
export type SectionPick = {
  as: 'item' | 'panel';
  selected: boolean;
  onSelect: () => void;
  stage: SectionStage;
  summary?: ReactNode;
};

// Lo que una sección recibe para elegirse: su resumen lo arma ella, con los datos que ella misma lee.
export type SectionPickControl = Omit<SectionPick, 'summary'>;

const STAGE_LABEL: Record<SectionStage, { text: string; className: string }> = {
  done: { text: '✓ Hecha', className: 'bg-ok-bg text-ok' },
  current: { text: 'Actual', className: 'bg-info-bg text-info' },
  pending: { text: 'Pendiente', className: 'bg-muted text-muted-foreground' },
};

// El renglón de una sección en la lista de etapas: elegir la que ya está elegida no hace nada, porque
// el panel siempre muestra una. La elegida lleva el filete del acento a la izquierda y un fondo
// tenue, además del texto de su estado: el color solo no basta.
export function SectionItem({
  title,
  accent,
  pick,
}: {
  title: string;
  accent: ModuleAccent;
  pick: SectionPick;
}) {
  const stage = STAGE_LABEL[pick.stage];
  return (
    <button
      aria-current={pick.selected ? 'true' : undefined}
      className={cn(
        'flex w-full min-w-0 cursor-pointer flex-col gap-0.5 border-b border-l-4 border-b-border border-l-transparent px-4 py-3 text-left outline-offset-[-2px] last:border-b-0',
        pick.selected && 'border-l-[var(--mod)] bg-[var(--cobre-tint)]',
      )}
      onClick={() => {
        if (!pick.selected) pick.onSelect();
      }}
      style={accentStyle(accent)}
      type="button"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-sans text-base font-extrabold text-selva">
          {title}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
            stage.className,
          )}
        >
          {stage.text}
        </span>
      </span>
      {pick.summary && (
        <span className="text-sm text-muted-foreground">{pick.summary}</span>
      )}
    </button>
  );
}
