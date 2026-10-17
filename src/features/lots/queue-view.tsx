import type { QueueView } from '@/components/sync-tray/queue-view';
import type { QueueItem } from '@/lib/offline/db';

import { LotDiscardDialog } from './components/lot-discard-dialog';
import { LOT_RESOURCE, queuedLotOf } from './lot-queue';

// Un lote que espera conexión no ofrece nada: todavía puede llegar bien. El que el servidor
// rechazó solo se descarta: corregirlo no sirve de nada, porque no tiene datos que cambiar.
function LotQueueActions({ item }: { item: QueueItem }) {
  const lot = queuedLotOf(item);
  if (lot.status !== 'error') return null;
  return <LotDiscardDialog label={lot.label} lotId={lot.id} />;
}

// Los lotes en la bandeja, nombrados por la cosecha de la que salen.
export const lotQueueView: QueueView = {
  resource: LOT_RESOURCE,
  kind: 'Lote',
  title: (item) => queuedLotOf(item).label,
  Actions: LotQueueActions,
};
