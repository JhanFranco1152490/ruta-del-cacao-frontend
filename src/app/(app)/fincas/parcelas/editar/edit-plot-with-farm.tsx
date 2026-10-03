'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { FarmGateFromQuery } from '@/features/farms/components/farm-gate-from-query';
import { EditPlotScreen } from '@/features/plots/components/edit-plot-screen';

// Aquí se juntan los dos dominios, como en la pantalla de registrar.
export function EditPlotWithFarm() {
  const plotId = useSearchParams().get('id');
  if (!plotId) return <ErrorState message="No se indicó qué parcela editar." />;
  return (
    <FarmGateFromQuery>
      {(farm) => <EditPlotScreen farm={farm} key={plotId} plotId={plotId} />}
    </FarmGateFromQuery>
  );
}
