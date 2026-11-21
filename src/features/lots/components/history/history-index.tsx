import { cn } from 'cn';

import type { LotHistoryStage } from '../../api';
import { HISTORY_ICONS } from '../../history/history-icons';
import { stageTitle } from '../../history/stage-title';
import { stageAnchorId } from './history-anchor';

// Un botón de ícono por etapa sobre la línea de tiempo, en el mismo orden, para ir a una sin
// recorrer todas; el de la etapa que se está leyendo va relleno. Solo en pantallas anchas, donde la historia es larga y los íconos caben en una
// fila; el nombre sale al pasar el cursor y lo lee un lector de pantalla.
export function HistoryIndex({
  stages,
  active,
  onSelect,
}: {
  stages: LotHistoryStage[];
  active: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav
      aria-label="Ir a una etapa"
      className="sticky top-16 z-10 -mx-1 mb-2 bg-background px-1 py-2 max-lg:hidden"
    >
      <ol className="flex flex-wrap gap-1.5">
        {stages.map((stage, index) => {
          const Icon = HISTORY_ICONS[stage.kind];
          const title = stageTitle(stage);
          const current = index === active;
          return (
            <li key={`${stage.kind}-${index}`}>
              <button
                aria-current={current ? 'step' : undefined}
                aria-label={title}
                className={cn(
                  'grid size-9 place-items-center rounded-full border transition-colors focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-cobre',
                  current
                    ? 'border-[var(--mod)] bg-[var(--mod)] text-white'
                    : 'border-border bg-card text-[var(--mod)] hover:border-[var(--mod)] hover:bg-muted',
                )}
                onClick={() => {
                  onSelect(index);
                  document
                    .getElementById(stageAnchorId(index))
                    ?.scrollIntoView({ block: 'start' });
                }}
                title={title}
                type="button"
              >
                <Icon aria-hidden="true" className="size-4" />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
