'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { UseFormSetError } from 'react-hook-form';

import { getErrorMessage } from '@/lib/api/errors';
import { applyApiFieldErrors } from '@/lib/api/form-errors';
import { readOrigin } from '@/lib/navigation/origin';
import { notify } from '@/lib/notify';

import { useCreateProducer, useUpdateProducer, type Producer } from './api';
import {
  PRODUCER_FORM_FIELDS,
  toProducerRequest,
  toProducerCreateRequest,
  type ProducerFormValues,
} from './schemas';

const SAVE_FALLBACK_MESSAGE =
  'No fue posible guardar el productor. Revisa tu conexión e inténtalo de nuevo.';

// Guardado del formulario: alta, o edición con la versión de `producer`, que debe ser la
// misma ficha con la que se inicializó el formulario (no una lectura posterior). Al terminar
// vuelve a la pantalla desde la que se abrió (la lista con sus filtros, o la ficha) y, si no vino
// de ninguna, va a la ficha; un error de un campo del formulario se marca en su campo y todo lo demás
// (versión obsoleta, la conexión, los mensajes de campos que el formulario no tiene) queda
// en un aviso general.
export function useProducerSave(
  producer: Producer | undefined,
  setError: UseFormSetError<ProducerFormValues>,
) {
  const router = useRouter();
  const origin = readOrigin(useSearchParams());
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
      onSuccess: (saved: Producer) => {
        const detail = `/productores/${saved.id}`;
        router.replace(origin ?? detail);
        if (producer) {
          notify.success('Productor actualizado');
        } else {
          // Si se vuelve a la lista, la ficha del productor nuevo es un paso más.
          notify.success(
            'Productor registrado',
            origin
              ? {
                  action: {
                    label: 'Ver productor',
                    onClick: () => router.push(detail),
                  },
                }
              : undefined,
          );
        }
      },
      onError: onFailure,
    };
    if (producer) {
      update.mutate(
        { id: producer.id, input, expectedVersion: producer.version },
        options,
      );
    } else {
      create.mutate(toProducerCreateRequest(values), options);
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
