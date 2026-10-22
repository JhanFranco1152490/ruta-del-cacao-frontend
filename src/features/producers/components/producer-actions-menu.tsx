'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { ActionsMenu } from '@/components/actions-menu';
import { StatusChangeDialog } from '@/components/status-change-dialog';
import { MenuItem } from '@/components/ui/menu';

import type { Producer } from '../api';
import { useProducerStatusChange } from '../use-producer-status-change';
import { ProducerDeleteDialog } from './producer-delete-dialog';
import {
  PRODUCER_STATUS_ACTIONS,
  producerStatusActionFor,
} from './producer-status-dialog';

// Desactivar (o reactivar) y eliminar el productor, detrás de «⋯» en la cabecera: son acciones de
// poco uso y no deben pesar como «Editar datos». Los diálogos se montan fuera del menú.
export function ProducerActionsMenu({
  producer,
  canDelete,
  onDeleted,
}: {
  producer: Producer;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const target = producer.status === 'active' ? 'inactive' : 'active';
  const status = useProducerStatusChange(producer, target);
  const [deleting, setDeleting] = useState(false);
  const statusAction = PRODUCER_STATUS_ACTIONS[target];
  return (
    <>
      <ActionsMenu
        className="h-11"
        label={`Más acciones de ${producer.first_name} ${producer.last_name}`}
      >
        <MenuItem
          className={target === 'inactive' ? 'text-destructive' : undefined}
          onClick={() => status.onOpenChange(true)}
        >
          <statusAction.Icon aria-hidden="true" className="size-4" />
          {statusAction.trigger}
        </MenuItem>
        {canDelete && (
          <MenuItem
            className="text-destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Eliminar productor
          </MenuItem>
        )}
      </ActionsMenu>
      <StatusChangeDialog
        action={producerStatusActionFor(status.dialogTarget, producer)}
        error={status.error}
        isPending={status.isPending}
        onConfirm={status.confirm}
        onOpenChange={status.onOpenChange}
        open={status.open}
      />
      {canDelete && (
        <ProducerDeleteDialog
          control={{ open: deleting, onOpenChange: setDeleting }}
          onDone={onDeleted}
          producer={producer}
        />
      )}
    </>
  );
}
