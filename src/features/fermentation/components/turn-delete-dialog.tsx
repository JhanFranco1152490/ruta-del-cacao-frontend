'use client';

import { cn } from 'cn';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { Button } from '@/components/ui/button';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { formatShortDateTime } from '@/lib/format/dates';
import { notify } from '@/lib/notify';

import { type FermentationTurn, useDeleteTurn } from '../api';
import { correctionErrorMessage } from '../turn-errors';

// Eliminar un volteo del servidor mientras la fermentación sigue; los siguientes cambian de número.
// El botón es propio para nombrar el volteo: en la tabla hay uno por fila.
export function TurnDeleteDialog({
  lotId,
  turn,
  number,
  isOnly,
  disabled,
  className,
}: {
  lotId: string;
  turn: FermentationTurn;
  number: number;
  // Es el único: sin él la fermentación no se puede finalizar.
  isOnly: boolean;
  disabled: boolean;
  // El tamaño del botón lo decide quien lo pone: en la tabla es de solo icono en escritorio.
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteTurn(lotId);
  const dialog = useConfirmAction(
    async () => {
      await remove.mutateAsync({ turnId: turn.id, version: turn.version });
      notify.success('Volteo eliminado');
    },
    correctionErrorMessage,
    { open, onOpenChange: setOpen },
  );
  const action: StatusChangeAction = {
    trigger: 'Eliminar',
    title: `¿Eliminar el volteo ${number} (${formatShortDateTime(turn.turned_at)})? Esta acción no se puede deshacer.`,
    description: isOnly
      ? 'La fermentación no se podrá finalizar sin volteos.'
      : 'Los volteos siguientes cambian de número.',
    confirm: 'Eliminar volteo',
    pending: 'Eliminando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return (
    <>
      <Button
        aria-label={`Eliminar el volteo ${number}`}
        className={cn('h-10', className)}
        disabled={disabled}
        onClick={() => setOpen(true)}
        size="office"
        variant="outline"
      >
        <Trash2 aria-hidden="true" className="size-4" />
        <span className={className ? 'md:sr-only' : undefined}>Eliminar</span>
      </Button>
      <StatusChangeDialog action={action} {...dialog} />
    </>
  );
}
