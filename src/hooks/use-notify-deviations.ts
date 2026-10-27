import { useEffect } from 'react';

import { notify } from '@/lib/notify';
import { onItemSynced } from '@/lib/offline/sync-queue';

// Avisa de los desvíos que el servidor encontró en un registro de campo (un volteo, una bitácora)
// al recibirlo: solo él los evalúa, así que el aviso sale cuando el registro llega, con conexión un
// momento después de guardar y sin ella al volver la red. Uno por registro, sin agrupar: cada uno
// es de un lote y una medición distintos. Va montado en el marco de la sesión, porque el envío
// puede terminar en cualquier pantalla.
export function useNotifyDeviations() {
  useEffect(
    () =>
      onItemSynced((item, adapter, response) => {
        const notice = adapter.syncNotice?.(item, response);
        if (!notice) return;
        notify.warning(notice.title, {
          description: notice.description,
          persistent: notice.critical,
        });
      }),
    [],
  );
}
