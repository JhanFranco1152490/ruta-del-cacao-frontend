import { QueueDiscardDialog } from '@/components/sync-tray/queue-discard-dialog';
import type { QueueView } from '@/components/sync-tray/queue-view';
import type { QueueItem } from '@/lib/offline/db';

import { EVIDENCE_RESOURCE, evidencePayloadOf } from './evidence-queue';
import { useDiscardEvidence } from './use-evidence-queue';

// Una foto que espera conexión no ofrece nada: todavía puede llegar bien. La que el servidor rechazó
// (otro formato, más de 5 MB, ya hay 5) solo se descarta: corregirla sería tomar otra.
function EvidenceQueueActions({ item }: { item: QueueItem }) {
  const discard = useDiscardEvidence();
  if (item.status !== 'error') return null;
  const photo = evidencePayloadOf(item);
  return (
    <QueueDiscardDialog
      description="Se borrará de este dispositivo y no se enviará al servidor."
      onDiscard={() => discard.mutateAsync(photo.id)}
      successMessage="Foto pendiente descartada"
      title={`¿Descartar la foto de ${photo.label}?`}
    />
  );
}

export const evidenceQueueView: QueueView = {
  resource: EVIDENCE_RESOURCE,
  kind: 'Foto',
  title: (item) => evidencePayloadOf(item).label,
  Actions: EvidenceQueueActions,
};
