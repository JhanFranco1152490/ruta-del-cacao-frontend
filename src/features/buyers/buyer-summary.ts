import type { Buyer, BuyerType } from './api';
import { BUYER_TYPES } from '@/lib/buyer-types';

export type BuyerSummary = {
  active: number;
  inactive: number;
  // El tipo con más compradores de los que se ven, o null si no hay ninguno.
  topType: { type: BuyerType; count: number } | null;
};

// `searched` son los que pasan la búsqueda y el tipo, en cualquier estado: así la franja dice
// cuántos inactivos hay aunque la lista muestre solo los activos. `shown`, los de la lista.
export function summarizeBuyers(
  searched: readonly Pick<Buyer, 'is_active'>[],
  shown: readonly Pick<Buyer, 'buyer_type'>[],
): BuyerSummary {
  const active = searched.filter((buyer) => buyer.is_active).length;
  let topType: BuyerSummary['topType'] = null;
  // En el orden de la historia de usuario, para que un empate siempre muestre el mismo.
  for (const type of BUYER_TYPES) {
    const count = shown.filter((buyer) => buyer.buyer_type === type).length;
    if (count > (topType?.count ?? 0)) topType = { type, count };
  }
  return { active, inactive: searched.length - active, topType };
}
