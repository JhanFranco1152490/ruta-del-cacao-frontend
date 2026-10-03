'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { ErrorState } from '@/components/error-state';

import { FarmGate, type GatedFarm } from './farm-gate';

// La finca viene en la dirección (`?finca=`): una sola página guardada abre sin conexión sobre
// cualquier finca, incluidas las creadas sin conexión.
export function FarmGateFromQuery({
  children,
}: {
  children: (farm: GatedFarm) => ReactNode;
}) {
  const id = useSearchParams().get('finca');
  if (!id)
    return <ErrorState message="No se indicó de qué finca es la parcela." />;
  // `key`: cambiar de finca sin salir de la página monta todo de nuevo, sin datos de la otra.
  return (
    <FarmGate id={id} key={id}>
      {children}
    </FarmGate>
  );
}
