'use client';

import { Power, PowerOff, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';

import type { Warehouse } from '../api';
import { useDeleteWarehouse, useUpdateWarehouse } from '../mutations';
import { warehouseFailureOf } from '../warehouse-errors';
import {
  WAREHOUSE_ACTIVATED,
  WAREHOUSE_DEACTIVATED,
  WAREHOUSE_DELETED,
} from '../warehouse-form';

export type WarehouseChange = 'activar' | 'desactivar' | 'eliminar';

const IN_USE_TEXT =
  'Ya recibió ingresos mientras tanto, así que no se puede eliminar. Puedes desactivarla: lo que tiene se sigue consultando y admite salidas.';

function actionFor(change: WarehouseChange, name: string): StatusChangeAction {
  if (change === 'activar') {
    return {
      trigger: 'Activar',
      title: `¿Activar ${name}?`,
      description: 'Volverá a recibir lotes clasificados de su finca.',
      confirm: 'Activar',
      pending: 'Activando…',
      Icon: Power,
      variant: 'default',
    };
  }
  if (change === 'desactivar') {
    return {
      trigger: 'Desactivar',
      title: `¿Desactivar ${name}?`,
      description:
        'No recibirá más ingresos. Lo que ya tiene se sigue consultando y admite salidas.',
      confirm: 'Desactivar',
      pending: 'Desactivando…',
      Icon: PowerOff,
      variant: 'default',
    };
  }
  return {
    trigger: 'Eliminar',
    title: `¿Eliminar ${name}?`,
    description:
      'Es para una bodega registrada por error. No se puede deshacer.',
    confirm: 'Eliminar',
    pending: 'Eliminando…',
    Icon: Trash2,
    variant: 'destructive',
  };
}

// Activar, desactivar o eliminar una bodega. Desactivar se puede deshacer, así que usa el botón
// principal. La lista solo ofrece eliminar una que nunca se usó, pero pudo recibir un ingreso entre
// que se cargó y se confirmó: entonces el servidor lo rechaza y el mismo diálogo ofrece desactivarla.
export function WarehouseConfirmDialog({
  warehouse,
  change,
  onClose,
  onDone,
}: {
  warehouse: Warehouse;
  change: WarehouseChange;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const update = useUpdateWarehouse(warehouse.id);
  const remove = useDeleteWarehouse(warehouse.id);
  // Solo una bodega activa puede haber recibido un ingreso mientras tanto.
  const [inUse, setInUse] = useState(false);
  const current: WarehouseChange = inUse ? 'desactivar' : change;

  const dialog = useConfirmAction(
    async () => {
      try {
        if (current === 'eliminar') {
          await remove.mutateAsync(warehouse.version);
          return onDone(WAREHOUSE_DELETED);
        }
        // El rechazo de eliminar no cambió la bodega: la versión leída sigue siendo la vigente.
        await update.mutateAsync({
          expected_version: warehouse.version,
          is_active: current === 'activar',
        });
        onDone(
          current === 'activar' ? WAREHOUSE_ACTIVATED : WAREHOUSE_DEACTIVATED,
        );
      } catch (error) {
        if (warehouseFailureOf(error, 'delete').kind === 'in-use') {
          setInUse(true);
        }
        throw error;
      }
    },
    (error) => {
      const failure = warehouseFailureOf(error, 'delete');
      return failure.kind === 'in-use' ? IN_USE_TEXT : failure.message;
    },
  );

  const offerDeactivate = inUse && change === 'eliminar';
  const action = offerDeactivate
    ? {
        ...actionFor('desactivar', warehouse.name),
        title: `No se puede eliminar ${warehouse.name}`,
        description: IN_USE_TEXT,
      }
    : actionFor(current, warehouse.name);
  return (
    <StatusChangeDialog
      {...dialog}
      // Al ofrecer desactivar, el motivo ya está en la descripción.
      error={offerDeactivate ? undefined : dialog.error}
      action={action}
      onOpenChange={(open) => {
        if (!open && !dialog.isPending) onClose();
      }}
      open
    />
  );
}
