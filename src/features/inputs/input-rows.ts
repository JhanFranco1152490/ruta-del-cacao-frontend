import type { AgriculturalInput, InputStock } from './api';
import { type InputFilters, matchesInputFilters } from './input-options';
import { sumQuantities } from './stock-sum';

export type InputRow = {
  input: AgriculturalInput;
  // Las existencias del insumo (en la finca elegida, o el total de todas); `null` si nunca tuvo
  // movimientos.
  quantity: string | null;
};

// Une el catálogo con las existencias y aplica los filtros. Un insumo puede traer varias filas de
// existencias (una por finca): su cantidad es la suma. La API ya entrega el catálogo ordenado por
// nombre, y ese orden se conserva.
export function buildInputRows(
  catalog: readonly AgriculturalInput[],
  stocks: readonly InputStock[],
  filters: InputFilters,
): InputRow[] {
  const byInput = new Map<string, string[]>();
  for (const stock of stocks) {
    byInput.set(stock.input_id, [
      ...(byInput.get(stock.input_id) ?? []),
      stock.quantity,
    ]);
  }
  return catalog
    .filter((input) => matchesInputFilters(input, filters))
    .map((input) => {
      const quantities = byInput.get(input.id);
      return {
        input,
        quantity: quantities ? sumQuantities(quantities) : null,
      };
    });
}
