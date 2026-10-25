'use client';

import { RotateCcw } from 'lucide-react';
import { useState } from 'react';

import {
  type StatusChangeAction,
  StatusChangeDialog,
} from '@/components/status-change-dialog';
import { useConfirmAction } from '@/hooks/use-confirm-action';
import { notify } from '@/lib/notify';

import { useResetParameters } from '../api';
import { saveErrorMessage } from '../parameters-errors';

// Restablecer vuelve los 15 valores a la línea base. No es destructivo (se deshace escribiendo los
// valores otra vez), así que usa el botón principal. Si hay cambios sin guardar, el diálogo avisa
// que se pierden.
export function ParametersResetDialog({
  version,
  producer,
  hasUnsavedChanges,
}: {
  version: number;
  producer: string | null;
  hasUnsavedChanges: boolean;
}) {
  const [open, setOpen] = useState(false);
  const reset = useResetParameters(producer);
  const dialog = useConfirmAction(
    async () => {
      await reset.mutateAsync(version);
      notify.success('Valores restablecidos a la línea base');
    },
    saveErrorMessage,
    { open, onOpenChange: setOpen },
  );
  const action: StatusChangeAction = {
    trigger: 'Restablecer línea base',
    title: '¿Restablecer la línea base?',
    description:
      'Los 15 valores vuelven a los de la línea base. Se aplican desde el siguiente registro.',
    confirm: 'Restablecer',
    pending: 'Restableciendo…',
    Icon: RotateCcw,
    variant: 'default',
  };

  return (
    <StatusChangeDialog
      action={action}
      trigger={action}
      triggerSize="office"
      triggerVariant="outline"
      {...dialog}
    >
      {hasUnsavedChanges && (
        <p className="text-sm font-bold text-warn">
          Los cambios sin guardar se pierden.
        </p>
      )}
    </StatusChangeDialog>
  );
}
