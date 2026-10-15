'use client';

import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ActionsMenu } from '@/components/actions-menu';
import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';
import { MenuItem } from '@/components/ui/menu';
import { getErrorMessage, isApiError } from '@/lib/api/errors';

import { useChangeFarmStatus } from '../api';
import type { FarmListItem } from '../farm-list-item';
import { farmEditPath } from '../farm-paths';
import { FARM_DELETED_CODE } from '../sync-adapter';
import { FarmDiscardDialog } from './farm-discard-dialog';
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

// Lo que sigue de «Ver detalle» en la tarjeta de una finca. El resto de lo que se puede hacer con
// ella va en el menú «⋯»: no se hace a diario y así la tarjeta no crece. Lo que necesita atención
// (corregir una finca que no llegó al servidor) sí queda a la vista.
export function FarmCardActions({ farm }: { farm: FarmListItem }) {
  if (farm.status === 'pending' || farm.status === 'error') {
    return <QueuedFarmActions farm={farm} />;
  }
  if (
    (farm.status !== 'active' && farm.status !== 'inactive') ||
    farm.version === undefined
  ) {
    return null;
  }
  return <ServerFarmActions farm={{ ...farm, version: farm.version }} />;
}

// Una finca que sigue en el dispositivo: corregirla mientras está pendiente o con error, y
// descartarla solo cuando falló (una pendiente todavía puede llegar bien).
function QueuedFarmActions({ farm }: { farm: FarmListItem }) {
  const [discarding, setDiscarding] = useState(false);
  // La finca ya no existe en el servidor: corregir la edición no sirve, solo descartarla.
  const canCorrect = farm.errorCode !== FARM_DELETED_CODE;
  const canDiscard = farm.status === 'error';

  return (
    <>
      {canCorrect && (
        <EditorLink
          aria-label={`Corregir ${farm.name}`}
          className={buttonVariants({ size: 'office', variant: 'action' })}
          href={farmEditPath(farm.id)}
        >
          <Pencil aria-hidden="true" className="size-4" /> Corregir
        </EditorLink>
      )}
      {canDiscard && (
        <>
          <ActionsMenu label={`Más acciones de ${farm.name}`}>
            <MenuItem
              className="text-destructive"
              onClick={() => setDiscarding(true)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Descartar
            </MenuItem>
          </ActionsMenu>
          <FarmDiscardDialog
            control={{ open: discarding, onOpenChange: setDiscarding }}
            farm={farm}
          />
        </>
      )}
    </>
  );
}

function ServerFarmActions({
  farm,
}: {
  farm: FarmListItem & { version: number };
}) {
  const changeStatus = useChangeFarmStatus();
  const [changingStatus, setChangingStatus] = useState(false);
  const isActive = farm.status === 'active';

  return (
    <>
      <ActionsMenu label={`Más acciones de ${farm.name}`}>
        <MenuItem render={<EditorLink href={farmEditPath(farm.id)} />}>
          <Pencil aria-hidden="true" className="size-4" />
          Editar
        </MenuItem>
        <MenuItem
          className={isActive ? 'text-destructive' : undefined}
          onClick={() => setChangingStatus(true)}
        >
          {isActive ? (
            <PowerOff aria-hidden="true" className="size-4" />
          ) : (
            <Power aria-hidden="true" className="size-4" />
          )}
          {isActive ? 'Desactivar' : 'Activar'}
        </MenuItem>
      </ActionsMenu>
      <FarmStatusDialog
        control={{ open: changingStatus, onOpenChange: setChangingStatus }}
        errorMessage={statusErrorMessage}
        farm={{
          name: farm.name,
          status: farm.status === 'active' ? 'active' : 'inactive',
        }}
        onChangeStatus={(target) =>
          changeStatus.mutateAsync({
            id: farm.id,
            isActive: target === 'active',
            expectedVersion: farm.version,
          })
        }
      />
    </>
  );
}
