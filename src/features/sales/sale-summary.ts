import { formatPesos } from '@/lib/format/pesos';
import { kilosText } from '@/lib/stock-quantity';

import type { SaleSummary } from './api';

// Las cifras de la franja de Ventas, ya escritas. Solo cuentan las ventas registradas: el servidor
// deja fuera las anuladas.
export const saleSummaryFigures = (summary: SaleSummary) => ({
  total: formatPesos(summary.total),
  g1Kg: kilosText(summary.g1_kg),
  g2Kg: kilosText(summary.g2_kg),
  sales: String(summary.sales),
});
