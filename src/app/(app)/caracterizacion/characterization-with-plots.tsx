'use client';

import { CharacterizationOverviewScreen } from '@/features/crops/components/characterization-overview-screen';
import { farmDetailPath } from '@/features/farms/farm-paths';
import { PlotOverview } from '@/features/plots/components/plot-overview';

// Aquí se juntan los dominios: la pantalla y la ficha de cada tarjeta son de cultivos, la lista
// de parcelas es de parcelas y el detalle al que lleva cada finca es de fincas.
export function CharacterizationWithPlots() {
  return (
    <CharacterizationOverviewScreen
      renderPlots={({ renderPlotDetails, renderSummary }) => (
        <PlotOverview
          farmHref={farmDetailPath}
          renderPlotDetails={renderPlotDetails}
          renderSummary={renderSummary}
        />
      )}
    />
  );
}
