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

// Lo que ofrece el filtro de plaga: las del catálogo que aparecen en la parcela, activas o no, por
// nombre y una vez cada una, y Otra al final si se escribió alguna. `chosen` es la plaga del filtro
// activo: se ofrece aunque todavía no esté entre las demás (llegan de otra lectura), para que el
// filtro no se vea como "Todas" mientras tanto. Su nombre sale de las filas ya filtradas.
export function pestFilterOptions(
  rows: readonly PestSummary[],
  chosen?: { value: string; rows: readonly PestSummary[] },
) {
  const options = listedPests(rows);
  if (!chosen || options.some(({ value }) => value === chosen.value)) {
    return options;
  }
  const named = listedPests(chosen.rows).find(
    ({ value }) => value === chosen.value,
  );
  return [
    ...options,
    named ?? {
      value: chosen.value,
      label: chosen.value === OTHER_PEST_FILTER ? 'Otra' : 'Plaga elegida',
    },
  ];
}

function listedPests(rows: readonly PestSummary[]) {
  const pests = new Map<string, string>();
  let hasOther = false;
  for (const { pest_disease: pest } of rows) {
    if (pest) pests.set(pest.id, pest.name);
    else hasOther = true;
  }
  return [
    ...[...pests]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    ...(hasOther ? [{ value: OTHER_PEST_FILTER, label: 'Otra' }] : []),
  ];
}
