'use client';

import type { ReactNode } from 'react';

import { PageHeader } from '@/components/page-header';

import { CharacterizationProgress } from './characterization-progress';
import { PlotCharacterizationSummary } from './plot-characterization-summary';

// Lo que esta pantalla necesita de cada parcela de la lista. La lista es del dominio de parcelas:
// la entrega la página, que une los dos.
type OverviewPlot = {
  id: string;
  code: string;
  isActive: boolean;
  farm: { id: string; isActive: boolean };
};

export type CharacterizationParts = {
  renderPlotDetails: (
    plot: OverviewPlot,
    pagePlotIds: readonly string[],
  ) => ReactNode;
  renderSummary: (pagePlotIds: readonly string[]) => ReactNode;
};

// El tercer paso del trabajo del productor: la ficha de cada parcela, de todas sus fincas, con
// cuántas faltan por caracterizar.
export function CharacterizationOverviewScreen({
  renderPlots,
}: {
  renderPlots: (parts: CharacterizationParts) => ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Caracterización productiva"
        title="Caracterización"
        description="Registra las variedades, las siembras y el manejo de cada parcela."
      />
      {renderPlots({
        renderSummary: (pagePlotIds) => (
          <CharacterizationProgress plotIds={pagePlotIds} />
        ),
        renderPlotDetails: (plot, pagePlotIds) => (
          <PlotCharacterizationSummary
            farmId={plot.farm.id}
            farmIsActive={plot.farm.isActive}
            pagePlotIds={pagePlotIds}
            plot={plot}
          />
        ),
      })}
    </div>
  );
}
