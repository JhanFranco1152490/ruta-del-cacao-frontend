'use client';

import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { ErrorState } from '@/components/error-state';

import { FarmDetailScreen, type FarmPlotsContext } from './farm-detail-screen';

export function FarmDetailFromQuery({
  renderPlots,
}: {
  renderPlots: (farm: FarmPlotsContext) => ReactNode;
}) {
  const id = useSearchParams().get('id');
  if (!id) return <ErrorState message="No se indicó qué finca abrir." />;
  // `key`: cambiar de finca sin salir de la página monta una pantalla nueva, sin datos de la otra.
  return <FarmDetailScreen id={id} key={id} renderPlots={renderPlots} />;
}
