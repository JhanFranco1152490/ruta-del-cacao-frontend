'use client';

import { parseAsString, useQueryStates } from 'nuqs';
import { useEffect, useEffectEvent } from 'react';

import { useHasConnection } from '@/hooks/use-has-connection';

import { useMarkNotificationRead } from './api';

// Los parámetros con que llega quien toca una push, en cualquier pantalla. `notificacion` es la
// que se abrió: se marca como leída, y sin conexión espera a que vuelva la red. `notificaciones`
// llega de una push que resume varias y abre el panel. Atendidos, salen de la URL.
const parsers = { notification: parseAsString, panel: parseAsString };
const urlKeys = { notification: 'notificacion', panel: 'notificaciones' };

export const OPEN_PANEL_VALUE = 'abiertas';

export function useNotificationLink({
  enabled,
  onOpenPanel,
}: {
  enabled: boolean;
  onOpenPanel: () => void;
}) {
  const [params, setParams] = useQueryStates(parsers, { urlKeys });
  const hasConnection = useHasConnection();
  const markRead = useMarkNotificationRead();

  const handle = useEffectEvent(() => {
    if (!enabled) return;
    if (params.panel === OPEN_PANEL_VALUE) {
      onOpenPanel();
      void setParams({ panel: null });
    }
    if (params.notification && hasConnection) {
      // Una que ya no existe o ya no se alcanza no tiene nada que marcar: no se avisa.
      markRead.mutate(params.notification);
      void setParams({ notification: null });
    }
  });

  useEffect(() => {
    handle();
  }, [enabled, params.panel, params.notification, hasConnection]);
}
