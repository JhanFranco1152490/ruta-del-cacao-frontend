'use client';

import { Pencil } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { EditorLink } from '@/components/editor-link';
import { Breadcrumb } from '@/components/breadcrumb';
import { DetailFooter } from '@/components/detail-footer';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { readOrigin } from '@/lib/navigation/origin';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useMunicipalityName } from '../api';
import { ProducerAccessNote } from './producer-access-note';
import { ProducerAccountCard } from './producer-account-card';
import { ProducerDataCard } from './producer-data-card';
import { ProducerDeleteDialog } from './producer-delete-dialog';
import { ProducerLoadGate } from './producer-load-gate';
import { ProducerStatusDialog } from './producer-status-dialog';
import { pageContainerClass } from '@/components/page-container';

export function ProducerDetailScreen({
  id,
  renderFarms,
}: {
  id: string;
  // Las fincas del productor, que son de otro dominio: las entrega quien junta los dos.
  renderFarms?: (producerId: string) => {
    // Los totales (cuadros de la fila de resumen) y la tabla de fincas.
    stats: ReactNode;
    list: ReactNode;
  };
}) {
  const municipalityName = useMunicipalityName();
  const router = useRouter();
  const origin = readOrigin(useSearchParams());
  const { data: user } = useSession();
  const canDelete = hasPermission(user, PERMISSIONS.PRODUCERS_DELETE);

  return (
    <ProducerLoadGate id={id}>
      {(producer) => {
        const farms = renderFarms?.(producer.id);
        return (
          <div className={pageContainerClass('wide')}>
            <Breadcrumb
              items={[
                { label: 'Productores', href: '/productores' },
                { label: `${producer.first_name} ${producer.last_name}` },
              ]}
            />
            <PageHeader
              // Con dos acciones la cabecera se apila hasta pantallas anchas (lg): en tableta no
              // caben junto al título.
              className="mt-5 sm:flex-col sm:items-stretch sm:justify-start lg:flex-row lg:items-end lg:justify-between"
              eyebrow="Ficha del productor"
              title={`${producer.first_name} ${producer.last_name}`}
              description={`Código de asociado: ${producer.member_code}`}
              actions={
                <>
                  <EditorLink
                    className={buttonVariants({
                      variant: 'outline',
                      size: 'office',
                      className: 'border-input bg-card px-4',
                    })}
                    href={`/productores/${producer.id}/editar`}
                  >
                    <Pencil aria-hidden="true" className="size-4" /> Editar
                    datos
                  </EditorLink>
                  <ProducerStatusDialog
                    producer={producer}
                    target={
                      producer.status === 'active' ? 'inactive' : 'active'
                    }
                  />
                  {canDelete && (
                    <ProducerDeleteDialog
                      producer={producer}
                      onDone={() => router.push('/productores')}
                    />
                  )}
                </>
              }
            />
            {farms ? (
              // Con las fincas: una fila de resumen (totales y estado del productor) y, debajo, a la
              // izquierda las fincas con la cuenta de acceso y a la derecha los datos, para que las dos
              // columnas queden de alto parecido.
              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {farms.stats}
                  <ProducerAccessNote status={producer.status} tile />
                </div>
                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                  <div className="space-y-5">
                    {farms.list}
                    <ProducerAccountCard producer={producer} />
                  </div>
                  <ProducerDataCard
                    producer={producer}
                    municipalityName={municipalityName}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <ProducerDataCard
                  producer={producer}
                  municipalityName={municipalityName}
                />
                <div className="space-y-5">
                  <ProducerAccessNote status={producer.status} />
                  <ProducerAccountCard producer={producer} />
                </div>
              </div>
            )}
            <div className="mt-6">
              <DetailFooter backHref={origin ?? '/productores'} />
            </div>
          </div>
        );
      }}
    </ProducerLoadGate>
  );
}
