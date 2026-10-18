'use client';

import { QueueDiscardDialog } from '@/components/sync-tray/queue-discard-dialog';

import { useDiscardCompletion } from '../use-completion-queue';

// Solo para una realización que el servidor rechazó: una pendiente todavía puede llegar bien.
export function CompletionDiscardDialog({
  activityId,
  label,
}: {
  activityId: string;
  // Cómo se nombra la labor: "Fertilización · P-03".
  label: string;
}) {
  const discard = useDiscardCompletion();
  return (
    <QueueDiscardDialog
      description="Se borrará de este dispositivo y no se enviará al servidor. La actividad queda como estaba."
      onDiscard={() => discard.mutateAsync(activityId)}
      successMessage="Realización pendiente descartada"
      title={`¿Descartar la realización de ${label}?`}
    />
  );
}
