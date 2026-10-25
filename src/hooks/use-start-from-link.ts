'use client';

import { useEffect, useRef } from 'react';

import { notify } from '@/lib/notify';

import type { ReadyLot } from './api';

// Abre el formulario de iniciar la fermentación del lote que trae el enlace (`?iniciar=`), cuando
// llegan los lotes listos. Si el lote ya no está entre ellos (alguien lo inició mientras tanto),
// avisa y no abre nada. En los dos casos el parámetro se quita para que recargar no lo repita.
export function useStartFromLink({
  lotId,
  readyLots,
  onFound,
  onDone,
}: {
  lotId: string | null;
  readyLots: readonly ReadyLot[] | undefined;
  onFound: (lot: ReadyLot) => void;
  onDone: () => void;
}) {
  // El parámetro tarda un instante en salir de la URL: sin esto el aviso saldría dos veces.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!lotId || !readyLots || handled.current === lotId) return;
    handled.current = lotId;
    const lot = readyLots.find(({ id }) => id === lotId);
    if (lot) onFound(lot);
    else notify.warning('Este lote ya no está listo para fermentar.');
    onDone();
  }, [lotId, readyLots, onFound, onDone]);
}
