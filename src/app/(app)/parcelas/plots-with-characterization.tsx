'use client';

import { PlotCharacterizationSummary } from '@/features/crops/components/plot-characterization-summary';
import { useFailedCharacterizationPlotIds } from '@/features/crops/use-characterization-queue';
import { farmDetailPath } from '@/features/farms/farm-paths';
import { PlotListScreen } from '@/features/plots/components/plot-list-screen';
import { useSession } from '@/hooks/use-session';

// Aquí se juntan los dominios: la lista es de parcelas, la ficha de cada tarjeta y sus envíos
// fallidos son de cultivos, y el detalle al que lleva cada finca es de fincas.
export function PlotsWithCharacterization() {
  const { data: user } = useSession();
  const failedPlotIds = useFailedCharacterizationPlotIds(user?.id);

  return (
    <PlotListScreen
      failedPlotIds={failedPlotIds}
      farmHref={farmDetailPath}
      renderPlotDetails={(plot, pagePlotIds) => (
        <PlotCharacterizationSummary
          farmId={plot.farm.id}
          farmIsActive={plot.farm.isActive}
          pagePlotIds={pagePlotIds}
          plot={plot}
        />
      )}
    />
  );
}
