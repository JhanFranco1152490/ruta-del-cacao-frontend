'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';

import { useMunicipalityName } from '../api';
import { BackToProducersLink } from './back-to-producers-link';
import { ProducerAccessNote } from './producer-access-note';
import { ProducerDataCard } from './producer-data-card';
import { ProducerLoadGate } from './producer-load-gate';
import { ProducerStatusDialog } from './producer-status-dialog';

export function ProducerDetailScreen({ id }: { id: string }) {
  const municipalityName = useMunicipalityName();

  return (
    <ProducerLoadGate id={id}>
      {(producer) => (
        <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8">
          <BackToProducersLink />
          <PageHeader
            // Con dos acciones la cabecera se apila hasta pantallas anchas (lg): en tableta no
            // caben junto al título.
            className="mt-5 sm:flex-col sm:items-stretch sm:justify-start lg:flex-row lg:items-end lg:justify-between"
            eyebrow="Ficha del productor"
            title={`${producer.first_name} ${producer.last_name}`}
            description={`Código de asociado: ${producer.member_code}`}
            actions={
              <>
                <Link
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'office',
                    className: 'border-input bg-card px-4',
                  })}
                  href={`/productores/${producer.id}/editar`}
                >
                  <Pencil aria-hidden="true" className="size-4" /> Editar datos
                </Link>
                <ProducerStatusDialog
                  producer={producer}
                  target={producer.status === 'active' ? 'inactive' : 'active'}
                />
              </>
            }
          />
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <ProducerDataCard
              producer={producer}
              municipalityName={municipalityName}
            />
            <ProducerAccessNote status={producer.status} />
          </div>
        </main>
      )}
    </ProducerLoadGate>
  );
}
