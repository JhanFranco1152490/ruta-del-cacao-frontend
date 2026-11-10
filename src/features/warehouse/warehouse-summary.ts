import type { LotWarehouseDetail } from './api';
import { GRADE_LABELS, kilosText } from './exit-quantity';

// La línea de la etapa en la lista: lo que falta ingresar, o dónde está el lote y lo que queda de
// cada calibre que entró.
export function warehouseSummary(warehouse: LotWarehouseDetail | null) {
  if (!warehouse) return 'Pendiente de ingreso';
  const grades = [
    ['g1', warehouse.g1_available_kg, warehouse.g1_entered_kg],
    ['g2', warehouse.g2_available_kg, warehouse.g2_entered_kg],
  ] as const;
  const stock = grades
    .filter(([, , entered]) => Number(entered) > 0)
    .map(
      ([grade, available]) =>
        `${GRADE_LABELS[grade]} ${kilosText(available)} kg`,
    );
  return ['En bodega', warehouse.warehouse_name, ...stock].join(' · ');
}
