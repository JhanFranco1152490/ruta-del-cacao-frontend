'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UseFormSetError } from 'react-hook-form';

import { getErrorMessage } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';

import { useCreateProducer, useUpdateProducer, type Producer } from './api';
import {
  PRODUCER_FORM_FIELDS,
  toProducerRequest,
  type ProducerFormValues,
} from './schemas';

const SAVE_FALLBACK_MESSAGE =
  'No fue posible guardar el productor. Revisa tu conexión e inténtalo de nuevo.';

// Guardado del formulario: alta, o edición con la versión de `producer`, que debe ser la
// misma ficha con la que se inicializó el formulario (no una lectura posterior). Al terminar
// va a la ficha; un error de un campo del formulario se marca en su campo y todo lo demás
// (versión obsoleta, la conexión, los mensajes de campos que el formulario no tiene) queda
// en un aviso general.
export function useProducerSave(
  producer: Producer | undefined,
  setError: UseFormSetError<ProducerFormValues>,
) {
  const router = useRouter();
  const create = useCreateProducer();
  const update = useUpdateProducer();
  const [generalError, setGeneralError] = useState('');

  const onFailure = (error: unknown) => {
    const { applied, unmatched } = applyApiFieldErrors(
      error,
      setError,
      PRODUCER_FORM_FIELDS,
    );
    const detail = getErrorMessage(error, SAVE_FALLBACK_MESSAGE);
    if (unmatched.length) {
      setGeneralError([...new Set([detail, ...unmatched])].join(' '));
    } else {
      setGeneralError(applied ? '' : detail);
    }
  };

  const save = (values: ProducerFormValues) => {
    setGeneralError('');
    const input = toProducerRequest(values);
    const options = {
      onSuccess: (saved: Producer) =>
        router.replace(`/productores/${saved.id}`),
      onError: onFailure,
    };
    if (producer) {
      update.mutate(
        { id: producer.id, input, expectedVersion: producer.version },
        options,
      );
    } else {
      create.mutate(input, options);
    }
  };

  // Tras guardar bien el botón sigue deshabilitado: hasta que carga la ficha hay una ventana en
  // la que un segundo clic repetiría la petición (y el servidor la rechazaría como duplicado o
  // como versión obsoleta).
  const isSaving =
    create.isPending ||
    create.isSuccess ||
    update.isPending ||
    update.isSuccess;

  return {
    save,
    isSaving,
    generalError,
    clearError: () => setGeneralError(''),
  };
}
