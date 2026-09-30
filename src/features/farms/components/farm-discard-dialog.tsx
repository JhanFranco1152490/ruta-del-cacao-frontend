'use client';

import { Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/confirm-dialog';

import type { FarmListItem } from '../farm-list-item';
import { queueErrorMessage } from '../queue-error-message';
import { useFarmDiscard } from '../use-farm-queue';

export function FarmDiscardDialog({ farm }: { farm: FarmListItem }) {
  const discard = useFarmDiscard();

  return (
    <ConfirmDialog
      trigger={
        <>
          <Trash2 aria-hidden="true" className="size-4" /> Descartar
        </>
      }
      triggerVariant="destructive"
      title={`¿Descartar la finca ${farm.name}?`}
      description="Se borrará de este teléfono y no se enviará al servidor. Esta acción no se puede deshacer."
      confirmLabel="Descartar finca"
      pendingLabel="Descartando…"
      variant="destructive"
      onConfirm={() => discard.mutateAsync(farm.id)}
      errorMessage={(error) =>
        queueErrorMessage(
          error,
          'No fue posible descartar la finca. Inténtalo nuevamente.',
        )
      }
    />
  );
}
