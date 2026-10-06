'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Breadcrumb } from '@/components/breadcrumb';
import { PageHeader } from '@/components/page-header';
import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useMunicipalityName } from '../api';
import { ProducerAccessNote } from './producer-access-note';
import { ProducerAccountCard } from './producer-account-card';
import { ProducerDataCard } from './producer-data-card';
import { ProducerDeleteDialog } from './producer-delete-dialog';
import { ProducerLoadGate } from './producer-load-gate';
import { ProducerStatusDialog } from './producer-status-dialog';

export function ProducerDetailScreen({ id }: { id: string }) {
  const municipalityName = useMunicipalityName();
  const router = useRouter();
  const { data: user } = useSession();
  const canDelete = hasPermission(user, PERMISSIONS.PRODUCERS_DELETE);

  return (
    <ProducerLoadGate id={id}>
      {(producer) => (
        <div className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8">
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
                {canDelete && (
                  <ProducerDeleteDialog
                    producer={producer}
                    onDone={() => router.push('/productores')}
                  />
                )}
              </>
            }
          />
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <ProducerDataCard
              producer={producer}
              municipalityName={municipalityName}
            />
            <div className="space-y-6">
              <ProducerAccessNote status={producer.status} />
              <ProducerAccountCard producer={producer} />
            </div>
          </div>
        </div>
      )}
    </ProducerLoadGate>
  );
}
