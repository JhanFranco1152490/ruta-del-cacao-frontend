import { hasPermission, type Permission } from '@/lib/permissions';

// Las pantallas que se miran desde la unidad productiva o desde la asociación (los indicadores, los
// reportes): cada vista es de un permiso. La cuenta técnica tiene los dos y elige cuál mira.
export const AUDIENCE_VIEWS = ['producer', 'association'] as const;
export type AudienceView = (typeof AUDIENCE_VIEWS)[number];

export const AUDIENCE_VIEW_OPTIONS: readonly {
  value: AudienceView;
  label: string;
}[] = [
  { value: 'producer', label: 'Productor' },
  { value: 'association', label: 'Asociación' },
];

export type AudiencePermissions = Record<AudienceView, Permission>;

type Account = { permissions?: readonly string[] } | null | undefined;

export function availableViews(
  user: Account,
  permissions: AudiencePermissions,
): AudienceView[] {
  return AUDIENCE_VIEWS.filter((view) =>
    hasPermission(user, permissions[view]),
  );
}

// La vista que se abre: la de la dirección si la cuenta la tiene y, si no, la primera que tiene.
// La asociación abre la suya antes que la del productor porque es la consolidada.
export function resolveView(
  available: readonly AudienceView[],
  requested: string | null,
): AudienceView | null {
  const wanted = AUDIENCE_VIEWS.find((view) => view === requested);
  if (wanted && available.includes(wanted)) return wanted;
  if (available.includes('association')) return 'association';
  return available[0] ?? null;
}
