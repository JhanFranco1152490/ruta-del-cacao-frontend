'use client';

import { useState } from 'react';

// Estado de un StatusChangeDialog cuya acción devuelve una promesa: mientras corre no se puede
// cerrar ni repetir; si falla, queda abierto con el motivo; si sale bien, se cierra.
export function useConfirmAction(
  action: () => Promise<unknown>,
  errorMessage: (error: unknown) => string,
) {
  const [open, setOpen] = useState(false);
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
