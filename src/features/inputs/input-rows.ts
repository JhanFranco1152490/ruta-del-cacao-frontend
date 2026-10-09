import type { AgriculturalInput, InputStock } from './api';
import { type InputFilters, matchesInputFilters } from './input-options';

export type InputRow = {
  input: AgriculturalInput;
  // Las existencias del insumo en la finca elegida; `null` si nunca tuvo movimientos en ella.
  quantity: string | null;
};

// Une el catálogo con las existencias de una finca y aplica los filtros. La API ya entrega el
// catálogo ordenado por nombre, y ese orden se conserva.
export function buildInputRows(
  catalog: readonly AgriculturalInput[],
  stocks: readonly InputStock[],
  filters: InputFilters,
): InputRow[] {
  const quantities = new Map(
    stocks.map((stock) => [stock.input_id, stock.quantity]),
  );
  return catalog
    .filter((input) => matchesInputFilters(input, filters))
    .map((input) => ({ input, quantity: quantities.get(input.id) ?? null }));
}
