'use client';

import { getErrorMessage, isApiError } from '@/lib/api/errors';

import { useChangeFarmStatus } from '../api';
import type { FarmListItem } from '../farm-list-item';
import { FarmStatusDialog } from './farm-status-dialog';

function statusErrorMessage(error: unknown) {
  if (isApiError(error) && error.code === 'stale_version') {
    return 'Alguien cambió esta finca mientras tanto. Cierra el diálogo y vuelve a intentarlo con los datos actualizados.';
  }
  return getErrorMessage(
    error,
    'No fue posible cambiar el estado de la finca. Revisa tu conexión e inténtalo nuevamente.',
  );
}

// Acciones sobre una finca que ya está en el servidor. Editarla es una acción de su detalle.
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
