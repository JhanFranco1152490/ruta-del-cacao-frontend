import { formatDecimal } from '@/lib/format/decimal';

import {
  PACKAGE_TYPE_OPTIONS,
  UNIT_SYMBOLS,
  type InputUnit,
} from './input-options';

// Las cantidades de insumos se guardan con hasta tres decimales.
const QUANTITY_DECIMALS = 3;
const MIN_PACKAGES_SHOWN = 0.1;

export type InputPackage = { package_type: string; package_size: string };

// La presentación de un insumo, o `null` si no tiene: empaque y contenido van siempre juntos.
export const inputPackageOf = (input: {
  package_type: string | null;
  package_size: string | null;
}): InputPackage | null =>
  input.package_type && input.package_size
    ? { package_type: input.package_type, package_size: input.package_size }
    : null;

const unitSymbol = (unit: string, amount: number) => {
  const symbol = UNIT_SYMBOLS[unit as InputUnit];
  if (!symbol) return unit;
  return amount === 1 ? symbol.singular : symbol.plural;
};

const packageNames = (packageType: string) => {
  const option = PACKAGE_TYPE_OPTIONS.find(
    (candidate) => candidate.value === packageType,
  );
  return option
    ? {
        singular: option.label.toLowerCase(),
        label: option.label,
        plural: option.plural,
      }
    : { singular: packageType, label: packageType, plural: packageType };
};

// El navegador escribe los negativos con guion; el signo menos se lee mejor junto a una cantidad.
const MINUS_SIGN = '−';

export function formatQuantity(value: string, unit: string) {
  const amount = Number(value);
  const number = formatDecimal(amount, QUANTITY_DECIMALS).replace(
    /^-/,
    MINUS_SIGN,
  );
  return `${number} ${unitSymbol(unit, amount)}`;
}

export function formatPackage(
  packageType: string,
  packageSize: string,
  unit: string,
) {
  return `${packageNames(packageType).label} de ${formatQuantity(packageSize, unit)}`;
}

// Las existencias en la unidad y, si el insumo tiene presentación, lo que equivalen en empaques:
// "250 mL · 2,5 potes". El medio pote es el pote abierto. Sin movimientos no es lo mismo que cero:
// cero es haber gastado todo.
export function formatStock(
  quantity: string | null,
  unit: string,
  inputPackage: InputPackage | null,
) {
  if (quantity === null) return 'Sin movimientos';
  const amount = formatQuantity(quantity, unit);
  const stock = Number(quantity);
  if (!inputPackage || stock <= 0) return amount;

  const names = packageNames(inputPackage.package_type);
  const packages = stock / Number(inputPackage.package_size);
  if (packages < MIN_PACKAGES_SHOWN) {
    return `${amount} · menos de ${formatDecimal(MIN_PACKAGES_SHOWN, 1)} ${names.plural}`;
  }
  const rounded = Math.round(packages * 10) / 10;
  const name = rounded === 1 ? names.singular : names.plural;
  return `${amount} · ${formatDecimal(rounded, 1)} ${name}`;
}

// Un negativo dice que se gastó más de lo que entró: faltan entradas por registrar.
export const isNegativeStock = (quantity: string | null) =>
  quantity !== null && Number(quantity) < 0;

const toThousandths = (value: string) => Math.round(Number(value) * 1000);

// Cuánto suman unos empaques en la unidad del insumo ("3" potes de "100" mL son "300"), en
// milésimas para no arrastrar errores de coma flotante. El resultado va con punto, como lo
// espera la API.
export function packagesToUnit(count: string, packageSize: string) {
  const thousandths = Math.round(
    (toThousandths(count) * toThousandths(packageSize)) / 1000,
  );
  return String(thousandths / 1000);
}

// Lo que un conteo cambia en las existencias. Sin movimientos todo lo contado es diferencia, y un
// conteo también corrige unas existencias negativas.
export function formatCountDifference(
  counted: string,
  stock: string | null,
  unit: string,
) {
  const thousandths = toThousandths(counted) - toThousandths(stock ?? '0');
  if (thousandths === 0) return 'Sin diferencia';
  const sign = thousandths > 0 ? '+' : '';
  return `Diferencia: ${sign}${formatQuantity(String(thousandths / 1000), unit)}`;
}
