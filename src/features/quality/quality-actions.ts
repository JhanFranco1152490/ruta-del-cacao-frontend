import type { LotStatus } from '@/lib/lot-status';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { QualityAction } from '@/lib/paths/quality';

export type QualityPermissions = {
  evaluate: boolean;
  classify: boolean;
  discard: boolean;
};

// Lo que la cuenta puede hacer en calidad, leído de sus permisos.
export const qualityPermissionsOf = (
  user: Parameters<typeof hasPermission>[0],
): QualityPermissions => ({
  evaluate: hasPermission(user, PERMISSIONS.QUALITY_EVALUATE),
  classify: hasPermission(user, PERMISSIONS.QUALITY_CLASSIFY),
  discard: hasPermission(user, PERMISSIONS.QUALITY_DISCARD),
});

export type QualityActionOffer = {
  action: QualityAction;
  label: string;
  // Descartar es irreversible: va como botón de peligro.
  danger: boolean;
  // Sin conexión la acción se ve pero no se puede usar, y se dice por qué.
  disabledReason: string | null;
};

export const OFFLINE_QUALITY_REASON = 'Registrar la calidad necesita conexión.';

const LABELS: Record<QualityAction, string> = {
  evaluar: 'Evaluar',
  clasificar: 'Clasificar',
  corregir: 'Corregir evaluación',
  descartar: 'Descartar lote',
};

// Lo que se puede hacer con un lote según su estado: el Seco se evalúa; el Evaluado se clasifica
// (la principal), se corrige o se descarta. Clasificado y Descartado son finales.
function actionsFor(
  status: LotStatus,
  can: QualityPermissions,
): QualityAction[] {
  if (status === 'dried') return can.evaluate ? ['evaluar'] : [];
  if (status !== 'evaluated') return [];
  const allowed: [QualityAction, boolean][] = [
    ['clasificar', can.classify],
    ['corregir', can.evaluate],
    ['descartar', can.discard],
  ];
  return allowed.filter(([, may]) => may).map(([action]) => action);
}

export function qualityActions({
  status,
  online,
  can,
}: {
  status: LotStatus;
  online: boolean;
  can: QualityPermissions;
}): QualityActionOffer[] {
  return actionsFor(status, can).map((action) => ({
    action,
    label: LABELS[action],
    danger: action === 'descartar',
    disabledReason: online ? null : OFFLINE_QUALITY_REASON,
  }));
}
