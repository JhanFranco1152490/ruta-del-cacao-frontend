'use client';

import type { ReactNode } from 'react';

import { UnavailablePage } from '@/components/unavailable-page';
import { getErrorMessage } from '@/lib/api/errors';

import { useProducer, type Producer } from '../api';
import { ProducerDetailSkeleton } from './producer-skeletons';

type ProducerLoadGateProps = {
  id: string;
  options?: Parameters<typeof useProducer>[1];
  children: (producer: Producer) => ReactNode;
};

// Carga de la ficha para las pantallas que la muestran o la editan: esqueleto mientras llega,
// error de página solo si nunca cargó. Un refetch fallido conserva `data` y la pantalla sigue a
// la vista (y un formulario abierto no pierde lo que la persona ya escribió).
export function ProducerLoadGate({
  id,
  options,
  children,
}: ProducerLoadGateProps) {
  const producer = useProducer(id, options);

  if (producer.isPending) return <ProducerDetailSkeleton />;
  if (producer.isLoadingError) {
    return (
      <UnavailablePage
        backHref="/productores"
        backLabel="Volver a productores"
        message={getErrorMessage(
          producer.error,
          'No fue posible cargar la ficha del productor.',
        )}
        title="No fue posible abrir la ficha"
      />
    );
  }
  return children(producer.data);
}
