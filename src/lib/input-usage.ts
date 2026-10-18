import {
  formatQuantity,
  formatStock,
  inputPackageOf,
} from './format/input-quantity';
import { normalizeCatalogName } from './format/search';
import { decimalPattern, isDecimal } from './validation/decimal';

// Los insumos que gastó una labor: los registran la realización de una actividad y los controles
// fitosanitarios, con las mismas filas y las mismas reglas.

// Lo que hace falta saber de un insumo del catálogo para elegirlo y escribir cuánto se gastó.
export type CatalogInput = {
  id: string;
  name: string;
  unit: string;
  package_type: string | null;
  package_size: string | null;
  is_active: boolean;
};

// Una fila del formulario: el insumo elegido (o vacío) y la cantidad tal como se escribe.
export type UsedInputRow = { input_id: string; quantity: string };

// Lo máximo que guarda el servidor por insumo usado (10 dígitos con 3 decimales).
const MAX_QUANTITY = 9_999_999.999;
const QUANTITY_DECIMALS = 3;

export const MISSING_INPUT_MESSAGE = 'Elige un insumo del catálogo';
export const MISSING_QUANTITY_MESSAGE = 'Indique la cantidad del insumo';
export const REPEATED_INPUT_MESSAGE = 'Este insumo ya está en la lista';
export const UNAVAILABLE_INPUT_MESSAGE =
  'Este insumo ya no está disponible. Elige otro del catálogo.';

// El teclado en español suele escribir la coma decimal; la API espera el punto.
export const normalizeQuantity = (quantity: string) =>
  quantity.trim().replace(',', '.');

function quantityError(quantity: string): string | null {
  if (!quantity) return MISSING_QUANTITY_MESSAGE;
  if (!isDecimal(quantity)) return 'Escribe una cantidad válida';
  const amount = Number(quantity);
  if (amount <= 0) return 'La cantidad debe ser mayor que cero';
  if (!decimalPattern(QUANTITY_DECIMALS).test(quantity)) {
    return `Usa máximo ${QUANTITY_DECIMALS} decimales`;
  }
  return amount > MAX_QUANTITY ? 'La cantidad es demasiado grande' : null;
}

export type UsedInputIssue = {
  index: number;
  field: keyof UsedInputRow;
  message: string;
};

// Lo que el servidor va a rechazar de las filas, dicho antes de guardar: un insumo sin elegir o
// repetido, y una cantidad que no es un número mayor que cero con hasta tres decimales. Las
// cantidades llegan ya normalizadas (`normalizeQuantity`).
export function usedInputIssues(
  rows: readonly UsedInputRow[],
): UsedInputIssue[] {
  const issues: UsedInputIssue[] = [];
  const seen = new Set<string>();
  rows.forEach(({ input_id, quantity }, index) => {
    if (!input_id) {
      issues.push({ index, field: 'input_id', message: MISSING_INPUT_MESSAGE });
    } else if (seen.has(input_id)) {
      issues.push({
        index,
        field: 'input_id',
        message: REPEATED_INPUT_MESSAGE,
      });
    }
    seen.add(input_id);
    const error = quantityError(quantity);
    if (error) issues.push({ index, field: 'quantity', message: error });
  });
  return issues;
}

export type InputChoice = { id: string; label: string; disabled: boolean };

// Los insumos que ofrece una fila: los activos que calzan con lo buscado (sin tildes, mayúsculas
// ni espacios, como en el catálogo), más el que la fila ya tiene elegido aunque no calce. Los que
// ya están en otra fila se ven, pero no se pueden elegir dos veces.
export function inputChoices(
  catalog: readonly CatalogInput[],
  {
    search,
    selectedId,
    takenIds,
  }: { search: string; selectedId: string; takenIds: ReadonlySet<string> },
): InputChoice[] {
  const wanted = normalizeCatalogName(search);
  return catalog
    .filter(
      (input) =>
        input.id === selectedId ||
        (input.is_active && normalizeCatalogName(input.name).includes(wanted)),
    )
    .map((input) => {
      const taken = input.id !== selectedId && takenIds.has(input.id);
      return {
        id: input.id,
        label: taken ? `${input.name} · Ya en la lista` : input.name,
        disabled: taken,
      };
    });
}

// Lo que hace falta de un insumo para escribir una cantidad suya.
export type QuantityInput = Pick<
  CatalogInput,
  'name' | 'unit' | 'package_type' | 'package_size'
>;

// La cantidad que se está escribiendo, con su unidad y lo que equivale en empaques ("100 kg · 2
// bultos"). `null` mientras no sea un número mayor que cero.
export function usedQuantityText(
  quantity: string,
  input: QuantityInput,
): string | null {
  const value = normalizeQuantity(quantity);
  if (!isDecimal(value) || Number(value) <= 0) return null;
  return formatStock(value, input.unit, inputPackageOf(input));
}

// Las existencias de la finca según la copia del dispositivo. Son solo una referencia: no limitan
// la cantidad, porque la labor ya se hizo.
export const stockReferenceText = (
  stock: string | null,
  input: QuantityInput,
) =>
  stock === null
    ? 'Sin movimientos en esta finca'
    : `Hay ${formatStock(stock, input.unit, inputPackageOf(input))}`;

// Un insumo gastado dicho en una frase: "100 kg de Urea 46 % (2 bultos)".
export function usedInputPhrase(quantity: string, input: QuantityInput) {
  const value = normalizeQuantity(quantity);
  const [, packages] = formatStock(
    value,
    input.unit,
    inputPackageOf(input),
  ).split(' · ');
  const amount = `${formatQuantity(value, input.unit)} de ${input.name}`;
  return packages ? `${amount} (${packages})` : amount;
}
