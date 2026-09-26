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
// La acción y la versión se congelan al abrir: si la ficha cambia en segundo plano con el
// diálogo abierto, confirmar sigue enviando lo que la persona vio (y el servidor responde con la
// versión obsoleta) en vez de cambiar el texto del diálogo bajo su cursor.
export function useProducerStatusChange(
  producer: Producer,
  target: ProducerStatus,
) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState({ version: producer.version, target });
  const change = useChangeProducerStatus();

  const onOpenChange = (next: boolean) => {
    if (change.isPending) return;
    if (next) setOpened({ version: producer.version, target });
    setOpen(next);
    if (!next) change.reset();
  };

  const confirm = () =>
    change.mutate(
      {
        id: producer.id,
        status: opened.target,
        expectedVersion: opened.version,
      },
      { onSuccess: () => setOpen(false) },
    );

  return {
    open,
    // Se conserva al cerrar: el contenido no cambia durante la animación de salida.
    dialogTarget: opened.target,
    onOpenChange,
    confirm,
    isPending: change.isPending,
    error: change.isError
      ? getErrorMessage(change.error, FALLBACK_MESSAGE)
      : undefined,
  };
}
