'use client';

import { QueueDiscardDialog } from '@/components/sync-tray/queue-discard-dialog';

import { useDiscardTurn } from '../use-turn-queue';

// Solo para un volteo que el servidor rechazó: uno pendiente todavía puede llegar bien.
export function TurnDiscardDialog({
  turnId,
  label,
}: {
  turnId: string;
  // Cómo se nombra el volteo: «000123-F02-P05-261014-1 · volteo 3 · 17 oct. 08:00».
  label: string;
}) {
  const discard = useDiscardTurn();

  return (
    <QueueDiscardDialog
      title={`¿Descartar el volteo ${label}?`}
      description="Se borrará de este dispositivo y no se enviará al servidor. Si el volteo sí se hizo y la fermentación sigue, tendrás que registrarlo de nuevo."
      successMessage="Volteo pendiente descartado"
      onDiscard={() => discard.mutateAsync(turnId)}
    />
  );
}
