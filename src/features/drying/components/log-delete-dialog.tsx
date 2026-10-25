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
import { formatShortDayMonth } from '@/lib/format/dates';
import { notify } from '@/lib/notify';

import { type DryingLog, useDeleteLog } from '../api';
import { correctionErrorMessage } from '../log-errors';

// Eliminar una bitácora del servidor mientras el secado sigue. El botón es propio para nombrar el
// día: en la tabla hay uno por fila.
export function LogDeleteDialog({
  lotId,
  log,
  isOnly,
  disabled,
  className,
}: {
  lotId: string;
  log: DryingLog;
  // Es la única: sin ella el secado no se puede finalizar.
  isOnly: boolean;
  disabled: boolean;
  // El tamaño del botón lo decide quien lo pone: en la tabla es de solo icono en escritorio.
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const remove = useDeleteLog(lotId);
  const dialog = useConfirmAction(
    async () => {
      await remove.mutateAsync({ logId: log.id, version: log.version });
      notify.success('Bitácora eliminada');
    },
    correctionErrorMessage,
    { open, onOpenChange: setOpen },
  );
  const action: StatusChangeAction = {
    trigger: 'Eliminar',
    title: `¿Eliminar la bitácora del día ${log.day_number} (${formatShortDayMonth(log.measured_at)})? Esta acción no se puede deshacer.`,
    description: isOnly
      ? 'El secado no se podrá finalizar sin bitácoras.'
      : 'Ese día quedará sin bitácora.',
    confirm: 'Eliminar bitácora',
    pending: 'Eliminando…',
    Icon: Trash2,
    variant: 'destructive',
  };

  return (
    <>
      <Button
        aria-label={`Eliminar la bitácora del día ${log.day_number}`}
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
