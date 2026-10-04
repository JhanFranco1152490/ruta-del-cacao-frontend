'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { CharacterizationScreen } from '@/features/crops/components/characterization-screen';
import { FarmGateFromQuery } from '@/features/farms/components/farm-gate-from-query';
import { PlotGate } from '@/features/plots/components/plot-gate';

// Aquí se juntan los tres dominios: la finca, la parcela y su ficha agronómica.
export function CharacterizationWithPlot() {
  const plotId = useSearchParams().get('id');
  if (!plotId) {
    return <ErrorState message="No se indicó qué parcela caracterizar." />;
  }
  return (
    <FarmGateFromQuery>
      {(farm) => (
        <PlotGate farm={farm} key={plotId} plotId={plotId}>
          {(plot) => (
            <CharacterizationScreen
              farm={{
                id: farm.id,
                name: farm.name,
                detailPath: farm.detailPath,
                isActive: farm.isActive,
              }}
              plot={{
                id: plot.id,
                code: plot.code,
                areaHectares: plot.areaHectares,
                isActive: plot.isActive,
              }}
            />
          )}
        </PlotGate>
      )}
    </FarmGateFromQuery>
  );
}
