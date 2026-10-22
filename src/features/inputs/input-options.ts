import type { components } from '@/lib/api/schema';
import { PACKAGE_TYPE_OPTIONS, UNIT_SYMBOLS } from '@/lib/format/input-units';
import { normalizeCatalogName } from '@/lib/format/search';

type Schemas = components['schemas'];

// Una finca que se puede elegir para ver o mover existencias.
export type FarmChoice = { id: string; name: string; is_active: boolean };
type Option<T extends string> = { value: T; label: string };

// En el orden en que se ofrecen en el formulario y en el filtro de la lista.
export const INPUT_TYPE_OPTIONS = [
  { value: 'fertilizer', label: 'Fertilizante' },
  { value: 'organic_fertilizer', label: 'Abono' },
  { value: 'fungicide', label: 'Fungicida' },
  { value: 'insecticide', label: 'Insecticida' },
  { value: 'other', label: 'Otro' },
] as const satisfies readonly Option<Schemas['InputTypeEnum']>[];

export type InputType = (typeof INPUT_TYPE_OPTIONS)[number]['value'];

export const INPUT_UNIT_OPTIONS = [
  { value: 'kg', label: 'Kilogramos' },
  { value: 'g', label: 'Gramos' },
  { value: 'l', label: 'Litros' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'unit', label: 'Unidades' },
] as const satisfies readonly Option<Schemas['UnitEnum']>[];

export type InputUnit = (typeof INPUT_UNIT_OPTIONS)[number]['value'];

export { PACKAGE_TYPE_OPTIONS, UNIT_SYMBOLS };

export type PackageType = (typeof PACKAGE_TYPE_OPTIONS)[number]['value'];

// Un valor que esta versión de la app no conoce se muestra tal como llega, en vez de esconderlo.
const labelOf = (options: readonly Option<string>[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

export const inputTypeLabel = (type: string) =>
  labelOf(INPUT_TYPE_OPTIONS, type);

export const inputUnitLabel = (unit: string) =>
  labelOf(INPUT_UNIT_OPTIONS, unit);

export type InputStatusFilter = 'active' | 'inactive' | 'all';

export type InputFilters = {
  search: string;
  type: string;
  status: InputStatusFilter;
};

type FilterableInput = { name: string; input_type: string; is_active: boolean };

// La búsqueda compara como el servidor al rechazar nombres repetidos: "urea46" encuentra
// "Urea 46 %".
export function matchesInputFilters(
  input: FilterableInput,
  { search, type, status }: InputFilters,
) {
  if (status === 'active' && !input.is_active) return false;
  if (status === 'inactive' && input.is_active) return false;
  if (type && input.input_type !== type) return false;
  const needle = normalizeCatalogName(search);
  return !needle || normalizeCatalogName(input.name).includes(needle);
}
