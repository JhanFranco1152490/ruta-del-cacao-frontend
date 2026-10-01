import type { FarmFormValues } from './schemas';

export type FarmDifference = {
  field: keyof FarmFormValues;
  server: string;
  mine: string;
};

const NUMERIC_FIELDS = new Set<keyof FarmFormValues>([
  'area_hectares',
  'altitude_masl',
  'latitude',
  'longitude',
]);

// Mismo orden que el formulario, para que la lista se lea igual que la pantalla.
const FIELDS: readonly (keyof FarmFormValues)[] = [
  'name',
  'municipality_id',
  'details',
  'area_hectares',
  'altitude_masl',
  'latitude',
  'longitude',
];

function sameValue(field: keyof FarmFormValues, a: string, b: string) {
  if (!NUMERIC_FIELDS.has(field)) return a.trim() === b.trim();
  // "12.50", "12,5" y "12.5" son la misma área; la API los guarda igual.
  return Number(a.replace(',', '.')) === Number(b.replace(',', '.'));
}

// Todo lo que la finca del servidor tiene distinto de lo que la persona va a reenviar. Al
// resolver un `stale_version` se reenvían todos los campos, así que cualquiera de estos que
// otra persona haya cambiado se reemplazaría: deben verse todos antes de guardar, no solo los
// más visibles.
export function farmDifferences(
  server: FarmFormValues,
  mine: FarmFormValues,
): FarmDifference[] {
  return FIELDS.filter(
    (field) => !sameValue(field, server[field], mine[field]),
  ).map((field) => ({ field, server: server[field], mine: mine[field] }));
}
