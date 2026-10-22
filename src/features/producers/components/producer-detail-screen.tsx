'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { Breadcrumb } from '@/components/breadcrumb';
import { pageContainerClass } from '@/components/page-container';
import { useSession } from '@/hooks/use-session';
import { readOrigin } from '@/lib/navigation/origin';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useMunicipalityName } from '../api';
import { ProducerDetailLayout } from './producer-detail-layout';
import { ProducerLoadGate } from './producer-load-gate';

export function ProducerDetailScreen({
  id,
  renderFarms,
}: {
  id: string;
  // Las fincas del productor, que son de otro dominio: las entrega quien junta los dos.
  renderFarms?: (producerId: string) => {
    // Las cifras de la franja de resumen y la lista de fincas.
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
      {(producer) => (
        <div className={pageContainerClass('wide')}>
          <ProducerDetailLayout
            backHref={origin ?? '/productores'}
            breadcrumb={
              <Breadcrumb
                items={[
                  { label: 'Productores', href: '/productores' },
                  { label: `${producer.first_name} ${producer.last_name}` },
                ]}
              />
            }
            canDelete={canDelete}
            farms={renderFarms?.(producer.id)}
            municipalityName={municipalityName}
            onDeleted={() => router.push('/productores')}
            producer={producer}
          />
        </div>
      )}
    </ProducerLoadGate>
  );
}
