'use client';

import {
  SchedulePlotActivity,
  SchedulePlotMenuItem,
} from '@/features/activities/components/schedule-plot-activity';
import { PlotCharacterizationSummary } from '@/features/crops/components/plot-characterization-summary';
import { FarmDetailFromQuery } from '@/features/farms/components/farm-detail-from-query';
import { FarmPlotsSection } from '@/features/plots/components/farm-plots-section';

// Aquí se juntan los dominios: la finca no conoce las parcelas, las parcelas no importan de
// fincas y ninguno de los dos conoce las fichas agronómicas ni las actividades. Es de cliente
// porque la sección de parcelas se entrega como función, y una función no puede pasar de un
// componente de servidor a uno de cliente.
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
          renderPlotMenuItems={(plot) => (
            <SchedulePlotMenuItem
              farm={{ id: farm.id, isActive: farm.isActive }}
              plot={{
                id: plot.id,
                code: plot.code,
                isActive: plot.isActive,
                isSynced: !plot.queue,
              }}
            />
          )}
          renderPlotShortcuts={(plot, card) => (
            <SchedulePlotActivity
              compact={card.compact}
              farm={{ id: farm.id, isActive: farm.isActive }}
              plot={{
                id: plot.id,
                code: plot.code,
                isActive: plot.isActive,
                // Una parcela que sigue en la cola todavía no existe en el servidor.
                isSynced: !plot.queue,
              }}
            />
          )}
        />
      )}
    />
  );
}
