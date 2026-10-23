'use client';

import { useSession } from '@/hooks/use-session';
import { isNotFound } from '@/lib/api/errors';
import { isNeverLoaded } from '@/lib/offline/paused-read';

import { type Fermentation, useFermentation, useFermentations } from './api';

export type TurnFermentation =
  | { kind: 'loading' }
  | { kind: 'ready'; fermentation: Fermentation }
  // El lote no existe, no se alcanza o nunca se fermentó.
  | { kind: 'missing' }
  | { kind: 'finished' }
  // Sin red y sin copia en el dispositivo.
  | { kind: 'unreachable' }
  | { kind: 'error'; retry: () => void };

// La fermentación del lote del volteo. Sale de la copia de la lista de Fermentación, para registrar
// también sin conexión; si el lote no está en ella (la cuenta técnica, que no tiene una copia
// propia, o una copia de antes de iniciar), se pide al servidor.
export function useTurnFermentation(lotId: string): TurnFermentation {
  const { data: user } = useSession();
  const superuser = user?.is_superuser === true;
  const list = useFermentations(user?.id, null, { enabled: !superuser });
  const inList = list.data?.data.find((item) => item.lot.id === lotId);
  const listSettled = superuser || !list.isPending;
  const detail = useFermentation(lotId, {
    enabled: !!user && listSettled && !inList,
  });

  if (inList) return { kind: 'ready', fermentation: inList };
  if (!user || !listSettled) return { kind: 'loading' };
  if (detail.data) {
    return detail.data.result
      ? { kind: 'finished' }
      : { kind: 'ready', fermentation: detail.data };
  }
  if (isNeverLoaded(detail)) return { kind: 'unreachable' };
  if (detail.isError) {
    return isNotFound(detail.error)
      ? { kind: 'missing' }
      : { kind: 'error', retry: () => void detail.refetch() };
  }
  return { kind: 'loading' };
}
