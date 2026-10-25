import { cn } from 'cn';
import { Check } from 'lucide-react';

import { accentStyle } from '@/components/page-blocks/accent';
import { LOT_STATUSES } from '@/lib/lot-status';

import { type LotStatus } from '@/lib/lot-status';
import { lotStages, stagePosition } from '../lot-stages';

// Dónde va el lote en su recorrido, de un vistazo: cinco tramos, el actual resaltado. En celular las
// etiquetas no caben y se dice en una línea («Etapa 2 de 5»); el lector de pantalla las oye todas.
export function LotStages({ status }: { status: LotStatus }) {
  const stages = lotStages(status);
  const { position, total } = stagePosition(status);
  const current = stages[position - 1];
  return (
    <section
      aria-label="Etapas del lote"
      className="motion-rise rounded-[var(--radius-card)] bg-card p-4 shadow-card sm:p-5"
      style={accentStyle('cobre')}
    >
      <p aria-hidden="true" className="mb-2 text-sm sm:hidden">
        Etapa {position} de {total} ·{' '}
        <span className="font-extrabold text-selva">{current.label}</span>
      </p>
      <ol className="grid grid-cols-5 gap-2">
        {stages.map(({ status: stage, label, state }) => {
          const Icon = state === 'done' ? Check : LOT_STATUSES[stage].Icon;
          return (
            <li
              aria-current={state === 'current' ? 'step' : undefined}
              key={stage}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'block h-1.5 rounded-full',
                  state === 'done' && 'bg-selva',
                  state === 'current' && 'bg-[var(--mod)]',
                  state === 'upcoming' && 'bg-muted',
                )}
              />
              <span
                className={cn(
                  'mt-2 items-center gap-1.5 text-sm max-sm:sr-only sm:flex',
                  state === 'current' && 'font-extrabold text-selva',
                  state === 'done' && 'font-semibold text-selva',
                  state === 'upcoming' && 'text-muted-foreground',
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0',
                    state === 'current' && 'text-[var(--mod)]',
                  )}
                />
                {label}
                {state === 'done' && <span className="sr-only"> (hecha)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
