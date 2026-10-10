'use client';

import { PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  StatusChangeDialog,
  type StatusChangeAction,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import {
  DEPENDENT_FARM_NAMES,
  useProducerDependents,
} from '@/lib/api/producer-dependents';

import {
  type Producer,
  useChangeProducerStatus,
  useDeleteProducer,
} from '../api';

const HAS_RECORDS = 'producer_has_records';

function deleteErrorMessage(error: unknown) {
  if (isApiError(error)) {
    if (error.code === 'stale_version') {
      return 'Alguien cambió este expediente mientras tanto. Vuelve a abrir la ficha para ver sus datos actuales.';
    }
    if (error.status === 404) return 'Este productor ya no existe.';
  }
  return getErrorMessage(
    error,
    'No fue posible eliminar el productor. Revisa tu conexión e inténtalo nuevamente.',
  );
}

const deleteAction = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar productor',
  title: `¿Eliminar al productor ${name}?`,
  description:
    'Solo para productores creados por error. Se borra del sistema y no se puede deshacer; queda constancia de que existió.',
  confirm: 'Eliminar productor',
  pending: 'Eliminando…',
  Icon: Trash2,
  variant: 'destructive',
});

const deactivateAction = (name: string): StatusChangeAction => ({
  trigger: 'Eliminar productor',
  title: `No se puede eliminar a ${name}`,
  description:
    'Tiene registros asociados. Desactivarlo bloquea su acceso sin perder sus datos ni su historial.',
  confirm: 'Desactivar productor',
  pending: 'Desactivando…',
  Icon: PowerOff,
  variant: 'destructive',
});

function Dependents({ producerId }: { producerId: string }) {
  const dependents = useProducerDependents(producerId, true);
  if (dependents.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Revisando lo que se eliminaría con él…
      </p>
    );
  }
  if (dependents.isError) return null;
  const { farmNames, farmCount, accountCount, inputCount } = dependents.data;
  const unnamed = farmCount - farmNames.length;
  return (
    <div className="space-y-2 text-sm">
      <p className="font-bold text-selva">Se eliminará también:</p>
      <ul className="list-disc pl-5">
        <li>{accountCount === 1 ? '1 cuenta' : `${accountCount} cuentas`}</li>
        <li>
          {farmCount === 0
            ? 'Ninguna finca'
            : farmCount === 1
              ? '1 finca'
              : `${farmCount} fincas`}
        </li>
        {inputCount !== null && (
          <li>
            {inputCount === 0
              ? 'Ningún insumo'
              : inputCount === 1
                ? '1 insumo'
                : `${inputCount} insumos`}
          </li>
        )}
      </ul>
      {farmNames.length > 0 && (
        <ul className="list-disc pl-5 text-muted-foreground">
          {farmNames.map((name, index) => (
            <li key={`${index}-${name}`}>{name}</li>
          ))}
          {unnamed > 0 && (
            <li>
              y {unnamed} más (se nombran las primeras {DEPENDENT_FARM_NAMES})
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// Eliminar es en línea y con confirmación. Si algo de lo que depende del productor es importante,
// el servidor no lo deja eliminar y el mismo diálogo ofrece desactivarlo en su lugar.
export function ProducerDeleteDialog({
  producer,
  onDone,
}: {
  producer: Producer;
  onDone: () => void;
}) {
  const remove = useDeleteProducer();
  const changeStatus = useChangeProducerStatus();
  const [hasRecords, setHasRecords] = useState(false);
  const offerDeactivate = hasRecords && producer.status === 'active';
  const name = `${producer.first_name} ${producer.last_name}`;

  const dialog = useConfirmAction(
    async () => {
      if (offerDeactivate) {
        // Desactivar no saca a la persona de la ficha: sigue en ella, ya como inactivo.
        await changeStatus.mutateAsync({
          id: producer.id,
          status: 'inactive',
          expectedVersion: producer.version,
        });
        return;
      }
      try {
        await remove.mutateAsync({
          id: producer.id,
          expectedVersion: producer.version,
        });
      } catch (error) {
        if (isApiError(error) && error.code === HAS_RECORDS) {
          setHasRecords(true);
        }
        throw error;
      }
      onDone();
    },
    (error) =>
      offerDeactivate
        ? getErrorMessage(
            error,
            'No fue posible desactivar el productor. Inténtalo nuevamente.',
          )
        : deleteErrorMessage(error),
  );

  const action = offerDeactivate ? deactivateAction(name) : deleteAction(name);

  return (
    <StatusChangeDialog
      {...dialog}
      action={action}
      onOpenChange={(open) => {
        if (dialog.isPending) return;
        dialog.onOpenChange(open);
        // Al cerrar se vuelve a ofrecer eliminar: el siguiente intento consulta de nuevo.
        if (!open) setHasRecords(false);
      }}
      trigger={deleteAction(name)}
    >
      {dialog.open && !hasRecords && <Dependents producerId={producer.id} />}
    </StatusChangeDialog>
  );
}
