import { useEffect, useEffectEvent } from 'react';

import type { QueueView } from '@/components/sync-tray/queue-view';
import { notify } from '@/lib/notify';
import type { QueueItem } from '@/lib/offline/db';
import { onItemRejected } from '@/lib/offline/sync-queue';

// Cuando el servidor rechaza un registro del dispositivo, avisa con un error que no se cierra
// solo y deja abrir la bandeja, donde se corrige o se descarta. Los registros se guardan y se
// envían aparte de la pantalla (quien guardó ya volvió a otra), así que sin este aviso el rechazo
// solo se vería en el indicador de la cabecera. Va montado en el marco de la sesión, como
// `useRefreshAfterSync`.
export function useNotifyRejected(
  views: readonly QueueView[],
  openTray: () => void,
) {
  const announce = useEffectEvent((item: QueueItem) => {
    const view = views.find(
      (candidate) => candidate.resource === item.resource,
    );
    const subject = view
      ? `${view.kind.toLowerCase()} ${view.title(item)}`
      : 'un registro';
    notify.error(`El servidor no aceptó ${subject}`, {
      description: item.errorMessage,
      action: { label: 'Revisar', onClick: openTray },
    });
  });

  useEffect(() => onItemRejected((item) => announce(item)), []);
}
