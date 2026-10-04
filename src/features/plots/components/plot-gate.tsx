'use client';

import type { ReactNode } from 'react';

import type { KnownPlot } from '../known-plots';
import { useKnownPlots } from '../use-known-plots';
import { PlotEditorSkeleton, PlotUnavailable } from './plot-screen-states';

// Carga la parcela de una pantalla que trabaja sobre ella (la ficha agronómica) y solo entonces
// pinta lo que sigue: la del servidor, su copia sin conexión o la que está pendiente en el
// dispositivo. Los otros dominios la usan sin conocer cómo se lee una parcela, como `FarmGate`.
export function PlotGate({
  farm,
  plotId,
  children,
}: {
  farm: { id: string; detailPath: string; isPendingCreate: boolean };
  plotId: string;
  children: (plot: KnownPlot) => ReactNode;
}) {
  const known = useKnownPlots(farm.id, { fromServer: !farm.isPendingCreate });

  if (known.isLoading) return <PlotEditorSkeleton />;
  if (known.isError) {
    return (
      <PlotUnavailable
        backHref={farm.detailPath}
        message="No fue posible leer las parcelas guardadas en este dispositivo."
      />
    );
  }
  const plot = known.plots?.find(({ id }) => id === plotId);
  if (!plot) {
    return (
      <PlotUnavailable
        backHref={farm.detailPath}
        message={
          known.serverUnavailable
            ? 'No fue posible cargar la parcela. Si no la has abierto antes con conexión, necesitas conexión para verla.'
            : 'No encontramos esta parcela en la finca.'
        }
      />
    );
  }
  return children(plot);
}
