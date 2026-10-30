import type { components } from '@/lib/api/schema';
import { formatShortDateTime } from '@/lib/format/dates';
import { hoursBetween } from '@/lib/format/hours';
import { logPath } from '@/lib/paths/drying';
import { turnPath } from '@/lib/paths/fermentation';
import { lotDetailPath } from '@/lib/paths/lots';
import {
  POSTHARVEST_ALERT_TITLES,
  type PostharvestAlertKind,
} from '@/lib/postharvest/alert-kinds';
import { dayNumberOf } from '@/lib/postharvest/drying-day';
import {
  moistureText,
  phText,
  temperatureText,
} from '@/lib/postharvest/measure-text';

import type { NotificationView } from './notice-parts';

type Schemas = components['schemas'];
type Notification = Schemas['Notification'];
type Lot = Schemas['LotBrief'];

const STAGES = {
  fermentation: {
    origin: 'Fermentación',
    status: 'fermenting',
    facility: 'cajón',
    finished: 'El lote ya terminó la fermentación',
    action: (lotId: string) => ({
      label: 'Registrar volteo',
      href: turnPath(lotId),
    }),
  },
  drying: {
    origin: 'Secado',
    status: 'drying',
    facility: 'marquesina',
    finished: 'El lote ya terminó el secado',
    action: (lotId: string) => ({
      label: 'Registrar bitácora',
      href: logPath(lotId),
    }),
  },
} as const;

type Stage = keyof typeof STAGES;

const PENDING_KINDS = new Set<PostharvestAlertKind>([
  'fermentation_first_turn_due',
  'fermentation_turn_due',
  'drying_log_due',
]);

const stageOf = (kind: PostharvestAlertKind): Stage =>
  kind.startsWith('fermentation_') ? 'fermentation' : 'drying';

// «000123-F02-P05-261014-1 · La Esperanza · cajón C-02». Sin la etapa (un aviso de secado de un lote
// que todavía no lo empezó), sin la infraestructura.
function subjectOf(lot: Lot, stage: Stage) {
  const facility = lot[stage]?.facility;
  return [
    lot.code,
    lot.farm.name,
    facility && `${STAGES[stage].facility} ${facility}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

// Lo que falta y desde cuándo. El día de secado es el de cuando se generó el aviso, el mismo que
// usó la evaluación.
function pendingDetail(
  notification: Notification,
  kind: PostharvestAlertKind,
  lot: Lot,
) {
  const at = notification.condition_at;
  if (!at) return null;
  if (kind === 'fermentation_first_turn_due') {
    return `Toca el ${formatShortDateTime(at)}`;
  }
  if (kind === 'fermentation_turn_due') {
    return `Pendiente desde el ${formatShortDateTime(at)}`;
  }
  const day = lot.drying
    ? `Día ${dayNumberOf(lot.drying.started_at, notification.created_at)} · `
    : '';
  return `${day}pendiente desde el ${formatShortDateTime(at)}`;
}

// La medición del registro como está ahora: si se corrigió, el valor corregido.
function deviationDetail(
  notification: Notification,
  kind: PostharvestAlertKind,
  lot: Lot,
) {
  const turn = notification.fermentation_turn;
  if (turn) {
    if (kind.startsWith('fermentation_temperature')) {
      return `Volteo ${turn.number} · ${temperatureText(turn.temperature_c)}`;
    }
    // El pH alto es normal los primeros días y solo avisa desde el cuarto: las horas desde el
    // inicio dicen por qué ya no lo es.
    const hours =
      kind === 'fermentation_ph_high' && lot.fermentation
        ? ` a las ${Math.floor(hoursBetween(lot.fermentation.started_at, turn.turned_at))} h`
        : '';
    return `Volteo ${turn.number} · pH ${phText(turn.ph)}${hours}`;
  }
  const log = notification.drying_log;
  return log
    ? `Día ${log.day_number} · ${moistureText(log.moisture_pct)}`
    : null;
}

// Un aviso de un lote en fermentación o en secado. Un pendiente se ve atenuado y sin acción cuando
// el registro ya llegó o el lote salió de la etapa; un desvío es algo que pasó y no se atenúa.
export function describePostharvestNotice(
  notification: Notification,
  kind: PostharvestAlertKind,
  lot: Lot,
): NotificationView {
  const stage = stageOf(kind);
  const base = {
    title: POSTHARVEST_ALERT_TITLES[kind],
    subject: subjectOf(lot, stage),
    href: lotDetailPath(lot.id),
    origin: STAGES[stage].origin,
  };
  if (!PENDING_KINDS.has(kind)) {
    return {
      ...base,
      look: 'deviation',
      detail: deviationDetail(notification, kind, lot),
      stale: false,
    };
  }
  if (lot.status !== STAGES[stage].status) {
    return {
      ...base,
      look: 'pending',
      detail: STAGES[stage].finished,
      stale: true,
    };
  }
  if (notification.resolved_at) {
    return {
      ...base,
      look: 'pending',
      detail: `Ya se registró · ${formatShortDateTime(notification.resolved_at)}`,
      stale: true,
    };
  }
  return {
    ...base,
    look: 'pending',
    detail: pendingDetail(notification, kind, lot),
    stale: false,
    action: STAGES[stage].action(lot.id),
  };
}
