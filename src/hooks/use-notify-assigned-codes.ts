import { useEffect } from 'react';

import { assignedCodeNotice } from '@/lib/format/assigned-code-notice';
import { notify } from '@/lib/notify';
import type { AssignedCode } from '@/lib/offline/adapters';
import { onItemSynced } from '@/lib/offline/sync-queue';

import { BATCH_MS } from './use-notify-after-sync';

// Avisa qué código le dio el servidor a cada finca o parcela creada en el dispositivo: el código
// no existe hasta que llega. Con conexión el aviso sale un momento después del de guardar; sin
// ella, al volver la red. Una tanda da un solo aviso por tipo. Va montado en el marco de la
// sesión, porque el envío puede terminar en cualquier pantalla.
export function useNotifyAssignedCodes() {
  useEffect(() => {
    let batch: AssignedCode[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onItemSynced((item, adapter, response) => {
      const assigned = adapter.assignedCode?.(item, response);
      if (!assigned) return;
      batch.push(assigned);
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const kind of ['farm', 'plot'] as const) {
          const ofKind = batch.filter((entry) => entry.kind === kind);
          if (ofKind.length) notify.success(assignedCodeNotice(kind, ofKind));
        }
        batch = [];
      }, BATCH_MS);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, []);
}
