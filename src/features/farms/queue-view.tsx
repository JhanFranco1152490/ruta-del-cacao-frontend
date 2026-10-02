import type { QueueView } from '@/components/sync-tray/queue-view';
import type { QueueItem } from '@/lib/offline/db';

import { FarmQueueActions } from './components/farm-queue-actions';
import { queuedFarmToListItem } from './farm-list-item';
import { FARM_RESOURCE } from './farm-queue';

function FarmQueueViewActions({
  item,
  onNavigate,
}: {
  item: QueueItem;
  onNavigate: () => void;
}) {
  return (
    <FarmQueueActions
      farm={queuedFarmToListItem(item)}
      onNavigate={onNavigate}
    />
  );
}

// Las fincas en la bandeja: su nombre, y las mismas acciones de Mis fincas.
export const farmQueueView: QueueView = {
  resource: FARM_RESOURCE,
  kind: 'Finca',
  title: (item) => queuedFarmToListItem(item).name,
  Actions: FarmQueueViewActions,
};
