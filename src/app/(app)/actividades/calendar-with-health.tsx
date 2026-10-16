'use client';

import { ActivityCalendarScreen } from '@/features/activities/components/activity-calendar-screen';
import { ActivityHealthDetail } from '@/features/health/components/activity-health-detail';
import { monitoringPath } from '@/features/health/health-paths';
import { MONITORING_RESOURCE } from '@/features/health/monitoring-queue';

// El resultado de un monitoreo es de sanidad: aquí se le dice al calendario dónde se registra, que
// mientras espera en la cola el monitoreo ya se ve realizado, y qué mostrar en su detalle. Es de cliente porque entrega una
// función, que no puede pasar de un componente de servidor a uno de cliente.
const CLOSING_RESOURCES = [MONITORING_RESOURCE];

export function CalendarWithHealth() {
  return (
    <ActivityCalendarScreen
      closingResources={CLOSING_RESOURCES}
      monitoringHref={monitoringPath}
      renderActivityDetails={(activity, { openActivity }) => (
        <ActivityHealthDetail
          activity={activity}
          onOpenActivity={openActivity}
        />
      )}
    />
  );
}
