'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/errors';

import { useMunicipalityName, useProducer } from '../api';
import { BackToProducersLink } from './back-to-producers-link';
import { ProducerAccessNote } from './producer-access-note';
import { ProducerDataCard } from './producer-data-card';
import { ProducerPageError } from './producer-page-error';
import { ProducerDetailSkeleton } from './producer-skeletons';
import { ProducerStatusDialog } from './producer-status-dialog';

export function ProducerDetailScreen({ id }: { id: string }) {
  const producer = useProducer(id);
  const municipalityName = useMunicipalityName();

  if (producer.isPending) return <ProducerDetailSkeleton />;
  // Solo si la ficha nunca cargó: un refetch fallido conserva `data` y la ficha sigue a la vista.
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

  const data = producer.data;
  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8">
      <BackToProducersLink />
      <PageHeader
        // Con dos acciones la cabecera se apila hasta pantallas anchas (lg): en tableta no
        // caben junto al título.
        className="mt-5 sm:flex-col sm:items-stretch sm:justify-start lg:flex-row lg:items-end lg:justify-between"
        eyebrow="Ficha del productor"
        title={`${data.first_name} ${data.last_name}`}
        description={`Código de asociado: ${data.member_code}`}
        actions={
          <>
            <Link
              className={buttonVariants({
                variant: 'outline',
                size: 'office',
                className: 'border-input bg-card px-4',
              })}
              href={`/productores/${data.id}/editar`}
            >
              <Pencil aria-hidden="true" className="size-4" /> Editar datos
            </Link>
            <ProducerStatusDialog
              producer={data}
              target={data.status === 'active' ? 'inactive' : 'active'}
            />
          </>
        }
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <ProducerDataCard producer={data} municipalityName={municipalityName} />
        <ProducerAccessNote status={data.status} />
      </div>
    </main>
  );
}
