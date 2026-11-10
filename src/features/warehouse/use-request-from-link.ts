'use client';

import { useEffect, useRef } from 'react';

import { notify } from '@/lib/notify';
import type { WarehouseAction } from '@/lib/paths/warehouse';

import type { DialogRequest } from './dialog-request';
import { OFFLINE_WAREHOUSE_REASON } from './warehouse-actions';

// Llegar con `?lote=&accion=` (desde Lotes) pide abrir ese formulario. Sin conexión se dice por qué
// no. En los dos casos los parámetros salen de la URL, para que recargar no lo repita; el diálogo
// lee el lote y decide si la acción todavía aplica.
export function useRequestFromLink({
  pending,
  online,
  onRequest,
  onDone,
}: {
  pending: { lotId: string; action: WarehouseAction } | null;
  online: boolean;
  onRequest: (request: DialogRequest) => void;
  onDone: () => void;
}) {
  // El parámetro tarda un instante en salir de la URL: sin esto se pediría dos veces.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    const key = `${pending.lotId}:${pending.action}`;
    if (handled.current === key) return;
    handled.current = key;
    if (online) onRequest({ action: pending.action, lotId: pending.lotId });
    else notify.warning(OFFLINE_WAREHOUSE_REASON);
    onDone();
  }, [pending, online, onRequest, onDone]);
}
