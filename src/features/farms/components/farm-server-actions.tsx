'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { getErrorMessage, isApiError } from '@/lib/api/errors';

import { useChangeFarmStatus } from '../api';
import type { FarmListItem } from '../farm-list-item';
import { FarmStatusDialog } from './farm-status-dialog';
import { farmEditPath } from '../farm-paths';

function statusErrorMessage(error: unknown) {
  if (isApiError(error) && error.code === 'stale_version') {
    return 'Alguien cambió esta finca mientras tanto. Cierra el diálogo y vuelve a intentarlo con los datos actualizados.';
  }
  return getErrorMessage(
    error,
    'No fue posible cambiar el estado de la finca. Revisa tu conexión e inténtalo nuevamente.',
  );
}

// Acciones sobre una finca que ya está en el servidor.
export function FarmServerActions({ farm }: { farm: FarmListItem }) {
  const changeStatus = useChangeFarmStatus();
  if (
    (farm.status !== 'active' && farm.status !== 'inactive') ||
    farm.version === undefined
  ) {
    return null;
  }
  const version = farm.version;

  return (
    <div className="flex flex-wrap gap-3">
      <Link
        aria-label={`Editar ${farm.name}`}
        className={buttonVariants({ variant: 'outline', className: 'h-11' })}
        href={farmEditPath(farm.id)}
      >
        <Pencil aria-hidden="true" className="size-4" /> Editar
      </Link>
      <FarmStatusDialog
        farm={{ name: farm.name, status: farm.status }}
        errorMessage={statusErrorMessage}
        onChangeStatus={(target) =>
          changeStatus.mutateAsync({
            id: farm.id,
            isActive: target === 'active',
            expectedVersion: version,
          })
        }
      />
    </div>
  );
}
