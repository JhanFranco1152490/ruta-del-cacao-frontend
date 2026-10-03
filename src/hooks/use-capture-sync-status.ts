'use client';

import { useSession } from '@/hooks/use-session';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { OFFLINE_WINDOW_DAYS } from '@/lib/offline/session-clock';

// Vencida la ventana sin conexión (días sin que el servidor confirme la sesión), no se aceptan
// capturas nuevas ni correcciones: la persona debe volver a iniciar sesión con conexión. Lo ya
// guardado sigue en la cola, que no deja de reintentar. `noun` es lo que se captura, en plural
// ("fincas", "parcelas"), para el aviso.
export function useCaptureSyncStatus(noun: string) {
  const { data: user } = useSession();
  const status = useSyncStatus(user?.id);
  return {
    status,
    blockedMessage: status.isWithinOfflineWindow
      ? null
      : `Pasaron más de ${OFFLINE_WINDOW_DAYS} días sin confirmar tu sesión. Inicia sesión con conexión para guardar ${noun}; lo que ya guardaste sigue en este dispositivo.`,
    // Mientras se llena un formulario solo importa saber que se guardará en el dispositivo o que
    // la ventana venció; el resto lo cuenta el indicador de la cabecera.
    showBanner: !status.isOnline || !status.isWithinOfflineWindow,
  };
}
