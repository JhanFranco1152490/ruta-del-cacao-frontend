'use client';

import { useRouter } from 'next/navigation';

import { notify } from '@/lib/notify';

import type { ReadyLot } from '../api';
import { StartFermentationDialog } from './start-fermentation-dialog';

// Iniciar la fermentación de un lote de la pestaña de listos: al terminar se abre su ficha.
export function StartReadyLot({
  lot,
  lotHref,
  facilitiesHref,
  onClose,
}: {
  lot: ReadyLot;
  lotHref: (id: string) => string;
  // La infraestructura de una finca; falta si la cuenta no puede consultarla.
  facilitiesHref?: (farmId: string) => string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { farm } = lot.harvest.plot;
  return (
    <StartFermentationDialog
      facilitiesHref={facilitiesHref?.(farm.id)}
      lot={{
        id: lot.id,
        code: lot.code,
        greenWeightKg: lot.green_weight_kg,
        farm,
      }}
      onClose={onClose}
      onSaved={() => {
        notify.success('Fermentación iniciada');
        router.push(lotHref(lot.id));
      }}
    />
  );
}
