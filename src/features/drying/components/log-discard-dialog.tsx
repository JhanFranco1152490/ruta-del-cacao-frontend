'use client';

import { QueueDiscardDialog } from '@/components/sync-tray/queue-discard-dialog';

import { useDiscardLog } from '../use-log-queue';

// Solo para una bitácora que el servidor rechazó: una pendiente todavía puede llegar bien.
export function LogDiscardDialog({
  logId,
  label,
}: {
  logId: string;
  // Cómo se nombra la bitácora: «000123-F02-P05-261014-1 · bitácora del día 3 · 17 oct».
  label: string;
}) {
  const discard = useDiscardLog();

  return (
    <QueueDiscardDialog
      title={`¿Descartar la bitácora ${label}?`}
      description="Se borrará de este dispositivo y no se enviará al servidor. Si la medición sí se hizo y el secado sigue, tendrás que registrarla de nuevo."
      successMessage="Bitácora pendiente descartada"
      onDiscard={() => discard.mutateAsync(logId)}
    />
  );
}
