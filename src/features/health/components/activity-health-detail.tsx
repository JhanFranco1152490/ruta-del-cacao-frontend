import type { components } from '@/lib/api/schema';

import { ControlOriginSection } from './control-origin-section';
import { EvidenceSection } from './evidence-section';
import { MonitoringResultSection } from './monitoring-result-section';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

// Lo que sanidad agrega al detalle de una actividad: el resultado de un monitoreo realizado, o la
// detección que atiende un control. Para las demás labores no agrega nada.
export function ActivityHealthDetail({
  activity,
  onOpenActivity,
}: {
  activity: AgriculturalActivity;
  // Abre el detalle de otra actividad (el monitoreo de un control), si quien lo muestra puede.
  onOpenActivity?: (activityId: string) => void;
}) {
  // La sección Evidencia solo existe en un monitoreo o un control realizados.
  const evidence = activity.status === 'done' && (
    <EvidenceSection activity={activity} />
  );
  if (activity.monitoring) {
    return (
      <>
        <MonitoringResultSection
          activity={activity}
          monitoring={activity.monitoring}
        />
        {evidence}
      </>
    );
  }
  const { control_of: controlOf } = activity;
  if (controlOf) {
    return (
      <>
        <ControlOriginSection
          controlOf={controlOf}
          onOpenMonitoring={
            onOpenActivity && (() => onOpenActivity(controlOf.monitoring_id))
          }
        />
        {evidence}
      </>
    );
  }
  return null;
}
