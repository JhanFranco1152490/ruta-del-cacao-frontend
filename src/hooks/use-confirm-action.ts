'use client';

import { useState } from 'react';

// Quien abre el diálogo desde fuera (un menú de acciones) lleva su estado: `open` y cómo cambia.
export type ConfirmControl = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Estado de un StatusChangeDialog cuya acción devuelve una promesa: mientras corre no se puede
// cerrar ni repetir; si falla, queda abierto con el motivo; si sale bien, se cierra. Con `control`
// el estado de abierto es de quien lo pasa y el diálogo no lleva botón propio.
export function useConfirmAction(
  action: () => Promise<unknown>,
  errorMessage: (error: unknown) => string,
  control?: ConfirmControl,
) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = control ? control.open : ownOpen;
  const setOpen = control ? control.onOpenChange : setOwnOpen;
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string>();

  const onOpenChange = (next: boolean) => {
    if (isPending) return;
    setOpen(next);
    if (!next) setError(undefined);
  };

  const onConfirm = async () => {
    setIsPending(true);
    setError(undefined);
    try {
      await action();
      setOpen(false);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setIsPending(false);
    }
  };

  return {
    open,
    onOpenChange,
    onConfirm: () => void onConfirm(),
    isPending,
    error,
  };
}
