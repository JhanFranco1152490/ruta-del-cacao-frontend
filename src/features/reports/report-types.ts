import type { AudiencePermissions, AudienceView } from '@/lib/audience-view';
import { hasPermission, PERMISSIONS, type Permission } from '@/lib/permissions';

import type {
  AssociationReportType,
  ProducerReportType,
  ReportType,
} from './api';

export const REPORT_VIEW_PERMISSIONS: AudiencePermissions = {
  producer: PERMISSIONS.REPORTS_VIEW_PRODUCER,
  association: PERMISSIONS.REPORTS_VIEW_ASSOCIATION,
};

const PRODUCER_REPORT_TYPES: readonly ProducerReportType[] = [
  'production',
  'quality',
  'inventory',
  'sales',
  'traceability',
];

// La asociación ve cifras por finca: nada de existencias ni de lotes uno por uno.
const ASSOCIATION_REPORT_TYPES: readonly AssociationReportType[] = [
  'production',
  'quality',
  'sales',
];

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  production: 'Producción',
  quality: 'Calidad',
  inventory: 'Inventario',
  sales: 'Comercialización',
  traceability: 'Trazabilidad',
};

// El reporte del productor trae el detalle de cada módulo, con precios: cada tipo pide además el
// permiso con que se consulta su módulo, para que nadie vea aquí lo que no ve allá. El servidor
// decide igual; esto solo evita ofrecer un tipo que respondería que no.
const MODULE_PERMISSIONS: Record<ProducerReportType, Permission> = {
  production: PERMISSIONS.HARVESTS_VIEW,
  quality: PERMISSIONS.LOTS_VIEW,
  inventory: PERMISSIONS.WAREHOUSE_VIEW_STOCK,
  sales: PERMISSIONS.SALES_VIEW,
  traceability: PERMISSIONS.LOTS_VIEW,
};

type Account = { permissions?: readonly string[] } | null | undefined;

// Los tipos que la cuenta puede generar en una vista. Los de la asociación son agregados por finca
// y no miran los permisos de los módulos.
export function availableReportTypes(
  user: Account,
  view: AudienceView,
): ReportType[] {
  if (view === 'association') return [...ASSOCIATION_REPORT_TYPES];
  return PRODUCER_REPORT_TYPES.filter((type) =>
    hasPermission(user, MODULE_PERMISSIONS[type]),
  );
}

// El tipo de la dirección, si la cuenta puede generarlo en esa vista; si no, ninguno: se elige.
export const resolveReportType = (
  available: readonly ReportType[],
  requested: string | null,
): ReportType | null => available.find((type) => type === requested) ?? null;

// Las existencias son las de hoy: el inventario no lleva periodo.
export const isWithoutPeriod = (type: ReportType | null) =>
  type === 'inventory';
