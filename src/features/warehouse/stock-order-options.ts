import type { StockOrdering } from './use-warehouse-filters';

// Las formas de ordenar las existencias en celular, donde la tabla es de tarjetas y no tiene
// cabecera. Las mismas que ofrece la cabecera en escritorio, dichas en palabras.
export const STOCK_ORDER_OPTIONS: readonly {
  value: StockOrdering;
  label: string;
}[] = [
  { value: '-entry_date', label: 'Ingreso más reciente' },
  { value: 'entry_date', label: 'Ingreso más antiguo' },
  { value: '-quantity', label: 'Más kilos primero' },
  { value: 'quantity', label: 'Menos kilos primero' },
  { value: 'lot', label: 'Código del lote' },
  { value: 'grade', label: 'Calibre' },
  { value: 'location', label: 'Ubicación' },
];
