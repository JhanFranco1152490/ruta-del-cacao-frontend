import type { components } from '@/lib/api/schema';
import { formatShortDate, formatShortDayMonth } from '@/lib/format/dates';

import { activityHref, type NotificationView, where } from './notice-parts';

type Schemas = components['schemas'];
type Notification = Schemas['Notification'];
type Activity = Schemas['AgriculturalActivity'];
type Detection = Schemas['DetectionOutput'];

// La plaga del catálogo o, con Otra, lo que se escribió.
const pestOf = (detection: Detection) =>
  detection.pest_disease?.name ?? detection.other_description ?? 'Otra';

function controlState(detection: Detection) {
  const [control] = detection.controls;
  if (control) {
    return {
      detail: `Control programado el ${formatShortDate(control.scheduled_date)}`,
      stale: true,
    };
  }
  const request = detection.control_request;
  if (request?.dismissed_at) {
    return { detail: 'No requiere control', stale: true };
  }
  if (!request) return { detail: null, stale: false };
  const when = formatShortDayMonth(request.requested_at);
  const who = request.requested_by?.full_name;
  return {
    detail: who ? `Lo pidió ${who} el ${when}` : `Se pidió el ${when}`,
    stale: false,
  };
}

// El aviso de una detección en la que alguien pidió un control. La detección viene dentro del
// monitoreo, como está hoy: si ya tiene un control o se decidió que no lo requiere, se ve atenuado.
export function describeControlPending(
  notification: Notification,
  monitoring: Activity,
): NotificationView {
  const detection = monitoring.monitoring?.detections.find(
    ({ id }) => id === notification.detection_id,
  );
  return {
    look: 'control',
    title: 'Control pendiente',
    subject: detection
      ? `${pestOf(detection)} · ${where(monitoring)}`
      : where(monitoring),
    ...(detection ? controlState(detection) : { detail: null, stale: false }),
    href: activityHref(monitoring),
  };
}
