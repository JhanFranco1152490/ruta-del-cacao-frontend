'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { OfflineBanner } from '@/components/offline-banner';
import { PageHeader } from '@/components/page-header';
import { TextField } from '@/components/text-field';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/api';
import { useMunicipalityName } from '@/lib/api/municipalities';
import { matchesSearch } from '@/lib/format/search';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useFarmSyncStatus } from '../use-farm-sync-status';
import { useLocalFarms } from '../use-local-farms';
import { FarmCardList } from './farm-card-list';
import { FarmQueueActions } from './farm-queue-actions';

export function FarmListScreen() {
  const { data: user } = useSession();
  const { farms, isError } = useLocalFarms(user?.id);
  const municipalityName = useMunicipalityName();
  const sync = useFarmSyncStatus();
  // En la URL, como en los demás listados: se puede compartir y el botón atrás la respeta.
  const [search, setSearch] = useQueryState(
    'buscar',
    parseAsString.withDefault(''),
  );
  const canAdd = hasPermission(user, PERMISSIONS.FARMS_ADD);

  const visibleFarms = farms?.filter((farm) =>
    matchesSearch(
      [farm.name, municipalityName(farm.municipalityCode), farm.details],
      search,
    ),
  );

  const registerLink = canAdd && (
    <Link className={buttonVariants({ size: 'office' })} href="/fincas/nueva">
      <Plus aria-hidden="true" className="size-5" /> Registrar finca
    </Link>
  );

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <PageHeader
        eyebrow="Gestión de fincas"
        title="Mis fincas"
        description="Consulta tus fincas y su estado de sincronización."
        actions={registerLink}
      />
      <div className="mt-6">
        <OfflineBanner status={sync.status} />
      </div>
      <section className="mt-8 space-y-5 rounded-[var(--radius-card)] bg-card p-5 shadow-card">
        <TextField
          label="Buscar finca"
          onChange={(event) => void setSearch(event.target.value || null)}
          placeholder="Nombre, municipio o vereda"
          type="search"
          value={search}
          wrapperClassName="max-w-md"
        />
        {isError ? (
          <ErrorState message="No fue posible leer las fincas guardadas en este dispositivo." />
        ) : !visibleFarms ? (
          <div
            aria-label="Cargando fincas"
            className="grid gap-4 md:grid-cols-2"
            role="status"
          >
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : visibleFarms.length ? (
          <FarmCardList
            farms={visibleFarms}
            municipalityName={municipalityName}
            renderActions={
              canAdd ? (farm) => <FarmQueueActions farm={farm} /> : undefined
            }
          />
        ) : search ? (
          <EmptyState
            title="No hay fincas que coincidan"
            description="Prueba con otro nombre, municipio o vereda."
          />
        ) : (
          <EmptyState
            title="Aún no tienes fincas registradas"
            description="Registra tu primera finca con su ubicación. Puedes hacerlo sin conexión."
            action={registerLink}
          />
        )}
      </section>
    </div>
  );
}
