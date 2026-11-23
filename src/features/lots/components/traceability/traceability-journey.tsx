import { SectionCard } from '@/components/page-blocks/section-card';

import { HISTORY_ICONS } from '../../history/history-icons';
import type { PublicStage } from '../../public-traceability';
import { publicStageDetail, publicStageTitle } from '../../traceability-text';

// El recorrido del lote en el orden en que pasó, en lenguaje para quien no conoce la app: un ícono,
// el nombre de la etapa y su fecha, o sus días y su periodo.
export function TraceabilityJourney({ stages }: { stages: PublicStage[] }) {
  return (
    <SectionCard accent="cobre" title="Recorrido del lote">
      <ol className="motion-stagger space-y-0">
        {stages.map((stage) => {
          const Icon = HISTORY_ICONS[stage.kind];
          return (
            <li className="group flex gap-3" key={stage.kind}>
              <div className="flex shrink-0 flex-col items-center">
                <span
                  aria-hidden="true"
                  className="flex size-10 items-center justify-center rounded-full border-2 border-cobre bg-card text-cobre"
                >
                  <Icon className="size-5" />
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1 w-0.5 flex-1 rounded-full bg-border group-last:hidden"
                />
              </div>
              <div className="min-w-0 flex-1 pb-4 group-last:pb-0">
                <h3 className="font-serif text-lg leading-tight">
                  {publicStageTitle(stage)}
                </h3>
                <p className="text-sm font-semibold text-muted-foreground">
                  {publicStageDetail(stage)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}
