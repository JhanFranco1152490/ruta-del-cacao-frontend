import type { components } from '@/lib/api/schema';

import { describeActivityNotice, isActivityKind } from './activity-notice-text';
import { describeControlPending } from './control-notice-text';
import type { NotificationView } from './notice-parts';

export type { NotificationLook, NotificationView } from './notice-parts';

type Notification = components['schemas']['Notification'];

const GENERIC: NotificationView = {
  look: 'generic',
  title: 'Aviso',
  subject: null,
  detail: null,
  stale: false,
  href: null,
};

// Lo que dice una notificación para quien la lee, con la actividad como está hoy. Un tipo que esta
// versión no conoce (de otro dominio) se muestra con un texto genérico y sin enlace, en vez de
// fallar. `today` es la fecha de Bogotá (yyyy-MM-dd).
export function describeNotification(
  notification: Notification,
  context: { userId: string | undefined; today: string },
): NotificationView {
  const { kind, activity } = notification;
  if (!activity) return GENERIC;
  if (isActivityKind(kind)) {
    return describeActivityNotice(notification, kind, activity, context);
  }
  if (kind === 'detection_control_pending') {
    return describeControlPending(notification, activity);
  }
  return GENERIC;
}
