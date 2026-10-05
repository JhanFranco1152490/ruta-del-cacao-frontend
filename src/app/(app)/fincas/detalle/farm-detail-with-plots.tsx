'use client';

import { PlotCharacterizationSummary } from '@/features/crops/components/plot-characterization-summary';
import { FarmDetailFromQuery } from '@/features/farms/components/farm-detail-from-query';
import { FarmPlotsSection } from '@/features/plots/components/farm-plots-section';

// Aquí se juntan los dominios: la finca no conoce las parcelas, las parcelas no importan de
// fincas y ninguno de los dos conoce las fichas agronómicas. Es de cliente porque la sección de
// parcelas se entrega como función, y una función no puede pasar de un componente de servidor a
// uno de cliente.
export function FarmDetailWithPlots() {
  return (
    <FarmDetailFromQuery
      renderPlots={(farm) => (
        <FarmPlotsSection
          farm={farm}
          renderPlotDetails={(plot) => (
            <PlotCharacterizationSummary
              farmId={farm.id}
              farmIsActive={farm.isActive}
              plot={{ id: plot.id, code: plot.code, isActive: plot.isActive }}
            />
          )}
        />
      )}
    />
  );
}
