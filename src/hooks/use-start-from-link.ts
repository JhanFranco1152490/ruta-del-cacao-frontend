'use client';

import { useEffect, useRef } from 'react';

import { notify } from '@/lib/notify';

// Abre el formulario de iniciar el proceso del lote que trae el enlace (`?iniciar=`), cuando llegan
// los lotes listos. Si el lote ya no está entre ellos (alguien lo inició mientras tanto), avisa con
// `missingMessage` y no abre nada. En los dos casos el parámetro se quita para que recargar no lo
// repita.
export function useStartFromLink<Lot extends { id: string }>({
  lotId,
  readyLots,
  missingMessage,
  onFound,
  onDone,
}: {
  lotId: string | null;
  readyLots: readonly Lot[] | undefined;
  missingMessage: string;
  onFound: (lot: Lot) => void;
  onDone: () => void;
}) {
  // El parámetro tarda un instante en salir de la URL: sin esto el aviso saldría dos veces.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!lotId || !readyLots || handled.current === lotId) return;
    handled.current = lotId;
    const lot = readyLots.find(({ id }) => id === lotId);
    if (lot) onFound(lot);
    else notify.warning(missingMessage);
    onDone();
  }, [lotId, readyLots, missingMessage, onFound, onDone]);
}
