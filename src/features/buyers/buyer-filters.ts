import type { Buyer, BuyerType } from './api';
import { normalizeBuyerName } from './buyer-name';

export type BuyerStatusFilter = 'active' | 'inactive' | 'all';

export type BuyerFilters = {
  search: string;
  // Vacío: todos los tipos.
  type: BuyerType | '';
  status: BuyerStatusFilter;
};

export const DEFAULT_BUYER_FILTERS: BuyerFilters = {
  search: '',
  type: '',
  status: 'active',
};

type Filterable = Pick<
  Buyer,
  'name' | 'contact_name' | 'identity_document' | 'buyer_type' | 'is_active'
>;

// La búsqueda y el tipo, sin el estado: las cifras de la franja cuentan activos e inactivos de lo
// que se buscó.
export function matchesBuyerSearch(
  buyer: Filterable,
  { search, type }: Pick<BuyerFilters, 'search' | 'type'>,
) {
  if (type && buyer.buyer_type !== type) return false;
  const needle = normalizeBuyerName(search);
  if (!needle) return true;
  return [buyer.name, buyer.contact_name ?? '', buyer.identity_document].some(
    (field) => normalizeBuyerName(field).includes(needle),
  );
}

export function matchesBuyerFilters(buyer: Filterable, filters: BuyerFilters) {
  if (filters.status === 'active' && !buyer.is_active) return false;
  if (filters.status === 'inactive' && buyer.is_active) return false;
  return matchesBuyerSearch(buyer, filters);
}

const byName = new Intl.Collator('es', { sensitivity: 'base' });

// Por nombre, sin distinguir mayúsculas ni tildes, y por `id` entre dos que se llaman igual, como
// los ordena el servidor: el orden no salta al volver a cargar.
export const sortBuyers = <T extends Pick<Buyer, 'id' | 'name'>>(
  buyers: readonly T[],
) =>
  [...buyers].sort(
    (a, b) =>
      byName.compare(a.name, b.name) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
