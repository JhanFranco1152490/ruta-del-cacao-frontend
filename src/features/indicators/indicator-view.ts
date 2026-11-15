import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// Cada panel es de un permiso: el del productor lo tiene su gente y el de la asociación, su
// administrador. La cuenta técnica tiene los dos y elige cuál mira.
export const INDICATOR_VIEWS = ['producer', 'association'] as const;
export type IndicatorView = (typeof INDICATOR_VIEWS)[number];

export const INDICATOR_VIEW_OPTIONS: readonly {
  value: IndicatorView;
  label: string;
}[] = [
  { value: 'producer', label: 'Productor' },
  { value: 'association', label: 'Asociación' },
];

type Account = { permissions?: readonly string[] } | null | undefined;

export function availableIndicatorViews(user: Account): IndicatorView[] {
  const views: IndicatorView[] = [];
  if (hasPermission(user, PERMISSIONS.INDICATORS_VIEW_PRODUCER)) {
    views.push('producer');
  }
  if (hasPermission(user, PERMISSIONS.INDICATORS_VIEW_ASSOCIATION)) {
    views.push('association');
  }
  return views;
}

// El panel que se abre: el de la dirección si la cuenta lo tiene y, si no, el primero que tiene.
// La asociación abre el suyo antes que el del productor porque es el consolidado.
export function resolveIndicatorView(
  available: readonly IndicatorView[],
  requested: string | null,
): IndicatorView | null {
  const wanted = INDICATOR_VIEWS.find((view) => view === requested);
  if (wanted && available.includes(wanted)) return wanted;
  if (available.includes('association')) return 'association';
  return available[0] ?? null;
}
