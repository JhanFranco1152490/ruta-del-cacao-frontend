import { z } from 'zod';

export function decimalPattern(maxDecimals: number) {
  return new RegExp(`^-?\\d+(\\.\\d{1,${maxDecimals}})?$`);
}

export function isDecimal(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value);
}

// El teclado en español suele escribir la coma decimal; se normaliza a punto, que es lo
// que espera la API.
export const decimalText = () =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(',', '.'));

// Un área en hectáreas: mayor que cero y con los decimales que guarda la API (más precisión la
// rechaza).
export const AREA_DECIMALS = 2;

export const areaHectaresField = () =>
  decimalText()
    .refine(
      (value) => isDecimal(value) && Number(value) > 0,
      'El área debe ser mayor a 0',
    )
    .refine(
      (value) => !isDecimal(value) || decimalPattern(AREA_DECIMALS).test(value),
      `Usa máximo ${AREA_DECIMALS} decimales.`,
    );
