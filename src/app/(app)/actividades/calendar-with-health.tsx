'use client';

import { ActivityCalendarScreen } from '@/features/activities/components/activity-calendar-screen';
import { ActivityHealthDetail } from '@/features/health/components/activity-health-detail';
import { monitoringPath } from '@/features/health/health-paths';
import { MONITORING_RESOURCE } from '@/features/health/monitoring-queue';
import { useQueuedControlActivities } from '@/features/health/use-queued-controls';
import { useSession } from '@/hooks/use-session';

// El resultado de un monitoreo es de sanidad: aquí se le dice al calendario dónde se registra, que
// mientras espera en la cola el monitoreo ya se ve realizado, qué mostrar en su detalle y los
// controles programados que todavía esperan en el dispositivo. Es de cliente porque entrega una
// función, que no puede pasar de un componente de servidor a uno de cliente.
const CLOSING_RESOURCES = [MONITORING_RESOURCE];

export function CalendarWithHealth() {
  const { data: user } = useSession();
  const queuedControls = useQueuedControlActivities(user?.id);
  return (
    <ActivityCalendarScreen
      closingResources={CLOSING_RESOURCES}
      monitoringHref={monitoringPath}
      queuedActivities={queuedControls}
      renderActivityDetails={(activity, { openActivity }) => (
        <ActivityHealthDetail
          activity={activity}
          onOpenActivity={openActivity}
        />
      )}
    />
  );
}
