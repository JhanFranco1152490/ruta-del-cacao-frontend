import { cn } from 'cn';
import { Check } from 'lucide-react';

import { accentStyle } from '@/components/page-blocks/accent';
import { LOT_STATUSES } from '@/lib/lot-status';

import { type LotStatus } from '@/lib/lot-status';
import { lotStages, stagePosition } from '../lot-stages';

// Dónde va el lote en su recorrido, de un vistazo: un tramo por etapa, el actual resaltado (en rojo
// si el lote se descartó). Por debajo de una pantalla ancha las siete etiquetas no caben y se dice en
// una línea («Etapa 2 de 7»); el lector de pantalla las oye todas.
export function LotStages({ status }: { status: LotStatus }) {
  const stages = lotStages(status);
  const { position, total } = stagePosition(status);
  const current = stages[position - 1];
  const discarded = status === 'discarded';
  return (
    <section
      aria-label="Etapas del lote"
      className="motion-rise rounded-[var(--radius-card)] bg-card p-4 shadow-card sm:p-5"
      style={accentStyle('cobre')}
    >
      <p aria-hidden="true" className="mb-2 text-sm xl:hidden">
        Etapa {position} de {total} ·{' '}
        <span
          className={cn(
            'font-extrabold',
            discarded ? 'text-err' : 'text-selva',
          )}
        >
          {current.label}
        </span>
      </p>
      <ol
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
        }}
      >
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
                  state === 'current' &&
                    (discarded ? 'bg-err' : 'bg-[var(--mod)]'),
                  state === 'upcoming' && 'bg-muted',
                )}
              />
              <span
                className={cn(
                  'mt-2 items-center gap-1.5 text-sm max-xl:sr-only xl:flex',
                  state === 'current' &&
                    (discarded
                      ? 'font-extrabold text-err'
                      : 'font-extrabold text-selva'),
                  state === 'done' && 'font-semibold text-selva',
                  state === 'upcoming' && 'text-muted-foreground',
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    'size-4 shrink-0',
                    state === 'current' &&
                      (discarded ? 'text-err' : 'text-[var(--mod)]'),
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
