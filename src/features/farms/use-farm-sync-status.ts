'use client';

import { useSession } from '@/hooks/use-session';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { OFFLINE_WINDOW_DAYS } from '@/lib/offline/session-clock';

// Vencida la ventana sin conexión (días sin que el servidor confirme la sesión), no se aceptan
// capturas nuevas ni correcciones: la persona debe volver a iniciar sesión con conexión. Lo ya
// guardado sigue en la cola, que no deja de reintentar.
const OFFLINE_WINDOW_EXPIRED = `Pasaron más de ${OFFLINE_WINDOW_DAYS} días sin confirmar tu sesión. Inicia sesión con conexión para guardar fincas; lo que ya guardaste sigue en este dispositivo.`;

export function useFarmSyncStatus() {
  const { data: user } = useSession();
  const status = useSyncStatus(user?.id);
  return {
    status,
    blockedMessage: status.isWithinOfflineWindow
      ? null
      : OFFLINE_WINDOW_EXPIRED,
  };
}
