'use client';

import { getErrorMessage } from '@/lib/api/errors';

import { useProducer } from '../api';
import { ProducerForm } from './producer-form';
import { ProducerPageError } from './producer-page-error';
import { ProducerDetailSkeleton } from './producer-skeletons';

export function ProducerEditorScreen({ id }: { id: string }) {
  // Sin revalidación automática: el formulario se inicializa una sola vez con esta lectura, y
  // volver a pedir la ficha (foco, reconexión) solo produciría datos que el formulario no adopta.
  const producer = useProducer(id, { staleTime: Infinity });

  if (producer.isPending) return <ProducerDetailSkeleton />;
  // Solo si la ficha nunca cargó: un refetch fallido conserva `data` y no debe descartar lo
  // que la persona ya escribió.
  if (producer.isLoadingError) {
    return (
      <ProducerPageError
        message={getErrorMessage(
          producer.error,
          'No fue posible cargar la ficha del productor.',
        )}
      />
    );
  }
  return <ProducerForm producer={producer.data} />;
}
