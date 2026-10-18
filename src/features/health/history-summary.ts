import { formatDecimal } from '@/lib/format/decimal';

import type { PestSummary } from './history-api';
import { OTHER_PEST_FILTER } from './history-filters';
import { SAMPLING_UNITS } from './monitoring-rules';

const nameOf = (row: PestSummary) =>
  row.pest_disease?.name ?? `Otra (${row.other_description})`;

// Una fila del resumen del historial: la última incidencia de una plaga y la anterior del mismo
// tipo de muestreo, para ver si sube o baja ("Monilia: 24 % de árboles · antes 31 %").
export function summaryText(row: PestSummary) {
  const latest = `${formatDecimal(row.latest_incidence, 2)} % de ${SAMPLING_UNITS[row.sampling_unit].plural}`;
  const before =
    row.previous_incidence === null
      ? 'primer registro'
      : `antes ${formatDecimal(row.previous_incidence, 2)} %`;
  return `${nameOf(row)}: ${latest} · ${before}`;
}

// Lo que ofrece el filtro de plaga: las del catálogo activo por nombre y Otra al final. `chosen` es
// la plaga del filtro puesto: se ofrece aunque ya no esté en el catálogo activo (se desactivó, o
// el catálogo no ha llegado), para que el filtro no se vea como "Todas".
export function pestFilterOptions(
  catalog: readonly { id: string; name: string }[] | undefined,
  chosen: string | null,
) {
  const options = [...(catalog ?? [])]
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .map(({ id, name }) => ({ value: id, label: name }));
  options.push({ value: OTHER_PEST_FILTER, label: 'Otra' });
  if (chosen && !options.some(({ value }) => value === chosen)) {
    options.push({ value: chosen, label: 'Plaga elegida' });
  }
  return options;
}
