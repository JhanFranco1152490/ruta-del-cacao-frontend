'use client';

import { useSession } from '@/hooks/use-session';
import { isNotFound } from '@/lib/api/errors';
import { isNeverLoaded } from '@/lib/offline/paused-read';

import { type Drying, useDrying, useDryings } from './api';

export type LogDrying =
  | { kind: 'loading' }
  | { kind: 'ready'; drying: Drying }
  // El lote no existe, no se alcanza o nunca se secó.
  | { kind: 'missing' }
  | { kind: 'finished' }
  // Sin red y sin copia en el dispositivo.
  | { kind: 'unreachable' }
  | { kind: 'error'; retry: () => void };

// El secado del lote de la bitácora. Sale de la copia de la lista de Secado, para registrar también
// sin conexión; si el lote no está en ella (la cuenta técnica, que no tiene una copia propia, o una
// copia de antes de iniciar), se pide al servidor.
export function useLogDrying(lotId: string): LogDrying {
  const { data: user } = useSession();
  const superuser = user?.is_superuser === true;
  const list = useDryings(user?.id, null, { enabled: !superuser });
  const inList = list.data?.data.find((item) => item.lot.id === lotId);
  const listSettled = superuser || !list.isPending;
  const detail = useDrying(lotId, user?.id, {
    enabled: !!user && listSettled && !inList,
  });

  if (inList) return { kind: 'ready', drying: inList };
  if (!user || !listSettled) return { kind: 'loading' };
  if (detail.data) {
    const drying = detail.data.data;
    return drying.result ? { kind: 'finished' } : { kind: 'ready', drying };
  }
  if (isNeverLoaded(detail)) return { kind: 'unreachable' };
  if (detail.isError) {
    return isNotFound(detail.error)
      ? { kind: 'missing' }
      : { kind: 'error', retry: () => void detail.refetch() };
  }
  return { kind: 'loading' };
}
