import { useEffect } from 'react';

import { notify } from '@/lib/notify';
import { onItemSynced } from '@/lib/offline/sync-queue';

// Un registro que sale de inmediato (con conexión) ya se avisó al guardarlo; solo se cuentan los
// que esperaron: los guardados sin conexión.
export const WAITED_MS = 10_000;
// Los registros de una misma tanda llegan uno tras otro: se espera a que pare para dar un solo
// aviso con el total.
export const BATCH_MS = 1_500;

export function syncedMessage(count: number) {
  return count === 1 ? 'Se envió 1 registro' : `Se enviaron ${count} registros`;
}

// Avisa con una notificación cuando la cola termina de enviar lo que esperaba. Va montado en el
// marco de la sesión, como `useRefreshAfterSync`, porque el envío puede terminar en cualquier
// pantalla.
export function useNotifyAfterSync() {
  useEffect(() => {
    let count = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onItemSynced((item) => {
      if (Date.now() - item.createdAt < WAITED_MS) return;
      count += 1;
      clearTimeout(timer);
      timer = setTimeout(() => {
        notify.success(syncedMessage(count));
        count = 0;
      }, BATCH_MS);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, []);
}
