'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { CharacterizationHistoryScreen } from '@/features/crops/components/characterization-history-screen';
import { FarmGateFromQuery } from '@/features/farms/components/farm-gate-from-query';
import { PlotGate } from '@/features/plots/components/plot-gate';

// Aquí se juntan los tres dominios: la finca, la parcela y el historial de su ficha.
export function HistoryWithPlot() {
  const plotId = useSearchParams().get('id');
  if (!plotId) {
    return (
      <ErrorState message="No se indicó de qué parcela ver el historial." />
    );
  }
  return (
    <FarmGateFromQuery>
      {(farm) => (
        <PlotGate farm={farm} key={plotId} plotId={plotId}>
          {(plot) => (
            <CharacterizationHistoryScreen
              farm={{
                id: farm.id,
                name: farm.name,
                detailPath: farm.detailPath,
              }}
              plot={{ id: plot.id, code: plot.code }}
            />
          )}
        </PlotGate>
      )}
    </FarmGateFromQuery>
  );
}
