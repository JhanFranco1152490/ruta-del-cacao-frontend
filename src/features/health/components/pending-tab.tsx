import { EmptyState } from '@/components/empty-state';

import type { usePendingItems } from '../use-pending-items';
import { PendingMonitoringsSection } from './pending-monitorings-section';
import { UpcomingMonitoringsSection } from './upcoming-monitorings-section';
import { WaitingControlsSection } from './waiting-controls-section';

// La pestaña Pendiente: lo que le toca hacer a quien mira (monitoreos por registrar y controles por
// atender) y, abajo, lo que viene.
export function PendingTab({
  items,
  producer,
}: {
  items: ReturnType<typeof usePendingItems>;
  producer: string | null;
}) {
  const { toRecord, waitingControls, coming, today } = items;
  if (toRecord.length + waitingControls.length + coming.length === 0) {
    return (
      <EmptyState
        description="Los monitoreos por registrar, los controles por atender y los que ya están programados aparecen aquí."
        title="No hay nada pendiente"
      />
    );
  }
  return (
    <div className="space-y-4">
      <PendingMonitoringsSection rows={toRecord} today={today} />
      <WaitingControlsSection
        detections={waitingControls}
        producer={producer}
      />
      <UpcomingMonitoringsSection rows={coming} />
    </div>
  );
}
