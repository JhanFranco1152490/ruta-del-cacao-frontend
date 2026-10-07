'use client';

import { PlotCharacterizationSummary } from '@/features/crops/components/plot-characterization-summary';
import { farmDetailPath } from '@/features/farms/farm-paths';
import { PlotListScreen } from '@/features/plots/components/plot-list-screen';

// Aquí se juntan los dominios: la lista es de parcelas, el estado de cada ficha es de cultivos y
// el detalle al que lleva cada finca es de fincas. En esta pantalla la ficha solo se resume: se
// trabaja en la de caracterización.
export function PlotsWithCharacterization() {
  return (
    <PlotListScreen
      farmHref={farmDetailPath}
      renderPlotDetails={(plot, pagePlotIds) => (
        <PlotCharacterizationSummary
          farmId={plot.farm.id}
          farmIsActive={plot.farm.isActive}
          pagePlotIds={pagePlotIds}
          plot={plot}
          withActions={false}
        />
      )}
    />
  );
}
