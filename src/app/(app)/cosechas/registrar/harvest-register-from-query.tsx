'use client';

import { useSearchParams } from 'next/navigation';

import { characterizationPath } from '@/features/crops/characterization-paths';
import { HarvestRegisterScreen } from '@/features/harvests/components/harvest-register-screen';

export function HarvestRegisterFromQuery() {
  const params = useSearchParams();
  const plotId = params.get('parcela') ?? undefined;
  const pendingId = params.get('pendiente') ?? undefined;
  // Otra parcela u otro registro es otra captura: la pantalla se monta de nuevo.
  return (
    <HarvestRegisterScreen
      characterizationHref={(plot) =>
        characterizationPath(plot.id, plot.farmId)
      }
      key={`${plotId ?? ''}:${pendingId ?? ''}`}
      pendingId={pendingId}
      plotId={plotId}
    />
  );
}
