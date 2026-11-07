'use client';

import { useEffect, useRef } from 'react';

import { notify } from '@/lib/notify';
import type { QualityAction } from '@/lib/paths/quality';

import { type LotQuality, useQualityLot } from './api';
import { LOT_UNAVAILABLE_MESSAGE, linkedActionOutcome } from './linked-action';
import type { QualityPermissions } from './quality-actions';

// Llegar con `?lote=&accion=` abre el formulario de ese lote, que puede estar en otra pestaña: se
// lee el lote con conexión y, si la acción todavía aplica, se abre; si no, se dice por qué. En los
// dos casos los parámetros salen de la URL, para que recargar no lo repita.
export function useActionFromLink({
  pending,
  online,
  can,
  onOpen,
  onDone,
}: {
  pending: { lotId: string; action: QualityAction } | null;
  online: boolean;
  can: QualityPermissions;
  onOpen: (lot: LotQuality, action: QualityAction) => void;
  onDone: () => void;
}) {
  const detail = useQualityLot(pending?.lotId ?? '', !!pending && online);
  // El parámetro tarda un instante en salir de la URL: sin esto el aviso saldría dos veces.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    const key = `${pending.lotId}:${pending.action}`;
    if (handled.current === key) return;
    if (!online) {
      handled.current = key;
      notify.warning('Registrar la calidad necesita conexión.');
      onDone();
      return;
    }
    if (detail.isError) {
      handled.current = key;
      notify.warning(LOT_UNAVAILABLE_MESSAGE);
      onDone();
      return;
    }
    if (!detail.data) return;
    handled.current = key;
    const outcome = linkedActionOutcome(detail.data, pending.action, can);
    if (outcome.open) {
      onOpen(detail.data, pending.action);
      // Los parámetros salen después de abrir: el formulario agrega al historial una entrada con la
      // dirección de ese momento, y si los parámetros salen antes el enrutador la restituye con ellos
      // y recargar o volver atrás repite la acción.
      setTimeout(onDone, 0);
      return;
    }
    notify.warning(outcome.message);
    onDone();
  }, [pending, online, can, detail.data, detail.isError, onOpen, onDone]);
}
