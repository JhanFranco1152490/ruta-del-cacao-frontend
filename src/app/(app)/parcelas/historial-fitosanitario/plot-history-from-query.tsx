'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';
import { PlotHistoryScreen } from '@/features/health/components/plot-history-screen';

export function PlotHistoryFromQuery() {
  const plotId = useSearchParams().get('id');
  if (!plotId) {
    return (
      <ErrorState message="No se indicó de qué parcela es el historial." />
    );
  }
  // Otra parcela es otro historial: la pantalla se monta de nuevo.
  return <PlotHistoryScreen key={plotId} plotId={plotId} />;
}
