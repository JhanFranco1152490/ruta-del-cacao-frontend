'use client';

import { FarmGateFromQuery } from '@/features/farms/components/farm-gate-from-query';
import { NewPlotScreen } from '@/features/plots/components/new-plot-screen';

// Aquí se juntan los dos dominios: la pantalla de parcelas recibe la finca ya leída, sin saber
// cómo se lee. Es de cliente porque la finca se entrega como función.
export function NewPlotWithFarm() {
  return (
    <FarmGateFromQuery>
      {(farm) => <NewPlotScreen farm={farm} />}
    </FarmGateFromQuery>
  );
}
