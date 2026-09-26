'use client';

import { useState } from 'react';

import { getErrorMessage } from '@/lib/api/errors';

import {
  useChangeProducerStatus,
  type Producer,
  type ProducerStatus,
} from './api';

const FALLBACK_MESSAGE =
  'No fue posible cambiar el estado del productor. Revisa tu conexión e inténtalo de nuevo.';

// Estado del diálogo de activar/desactivar: mientras la petición está en curso no se puede
// cerrar ni volver a confirmar, y un error (p. ej. versión obsoleta) lo deja abierto con el aviso.
export function useProducerStatusChange(
  producer: Producer,
  target: ProducerStatus,
) {
  const [open, setOpen] = useState(false);
  const change = useChangeProducerStatus();

  const onOpenChange = (next: boolean) => {
    if (change.isPending) return;
    setOpen(next);
    if (!next) change.reset();
  };

  const confirm = () =>
    change.mutate(
      { id: producer.id, status: target, expectedVersion: producer.version },
      { onSuccess: () => setOpen(false) },
    );

  return {
    open,
    onOpenChange,
    confirm,
    isPending: change.isPending,
    error: change.isError
      ? getErrorMessage(change.error, FALLBACK_MESSAGE)
      : undefined,
  };
}
