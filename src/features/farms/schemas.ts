import { z } from 'zod';

import { COORDINATE_DECIMALS } from '@/lib/format/coordinates';
import { OPERATING_AREA_BOUNDS } from '@/lib/geo/operating-area';

// Los límites de decimales coinciden con los que guarda la API: más precisión la rechaza.
const AREA_DECIMALS = 2;

function decimalPattern(maxDecimals: number) {
  return new RegExp(`^-?\\d+(\\.\\d{1,${maxDecimals}})?$`);
}

function isDecimal(value: string) {
  return /^-?\d+(\.\d+)?$/.test(value);
}

// El teclado en español suele escribir la coma decimal; se normaliza a punto, que es lo
// que espera la API.
const decimalText = () =>
  z
    .string()
    .trim()
    .transform((value) => value.replace(',', '.'));

export const OUTSIDE_OPERATING_AREA =
  'La ubicación está fuera de Norte de Santander';

const isInRange = (value: string, minimum: number, maximum: number) =>
  isDecimal(value) && Number(value) >= minimum && Number(value) <= maximum;

// Cada coordenada se valida contra su propio rango: el posible en el planeta y, dentro de él,
// el del departamento (los mismos números que valida la API). Así el error queda en el campo
// que lo causa y un punto afuera nunca llega a la cola sin conexión.
const requiredCoordinate = (
  [minimum, maximum]: readonly [number, number],
  [areaMinimum, areaMaximum]: readonly [number, number],
) =>
  decimalText()
    .refine((value) => value !== '', 'La georreferenciación es obligatoria')
    .refine(
      (value) => value === '' || isInRange(value, minimum, maximum),
      'Coordenadas no válidas',
    )
    .refine(
      (value) =>
        !isInRange(value, minimum, maximum) ||
        isInRange(value, areaMinimum, areaMaximum),
      OUTSIDE_OPERATING_AREA,
    )
    .refine(
      (value) =>
        value === '' ||
        !isDecimal(value) ||
        decimalPattern(COORDINATE_DECIMALS).test(value),
      `Usa máximo ${COORDINATE_DECIMALS} decimales.`,
    );

export const farmFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre de la finca.'),
  municipality_id: z.string().min(1, 'Selecciona un municipio.'),
  details: z.string().trim(),
  area_hectares: decimalText()
    .refine(
      (value) => isDecimal(value) && Number(value) > 0,
      'El área debe ser mayor a 0',
    )
    .refine(
      (value) => !isDecimal(value) || decimalPattern(AREA_DECIMALS).test(value),
      `Usa máximo ${AREA_DECIMALS} decimales.`,
    ),
  altitude_masl: z
    .string()
    .trim()
    .refine(
      (value) =>
        /^-?\d+$/.test(value) && Number(value) >= -500 && Number(value) <= 9000,
      'La altitud debe estar entre -500 y 9000.',
    ),
  latitude: requiredCoordinate(
    [-90, 90],
    [OPERATING_AREA_BOUNDS.south, OPERATING_AREA_BOUNDS.north],
  ),
  longitude: requiredCoordinate(
    [-180, 180],
    [OPERATING_AREA_BOUNDS.west, OPERATING_AREA_BOUNDS.east],
  ),
});

export type FarmFormValues = z.infer<typeof farmFormSchema>;

export const FARM_FORM_FIELDS = Object.keys(farmFormSchema.shape);

export const emptyFarmForm: FarmFormValues = {
  name: '',
  municipality_id: '',
  details: '',
  area_hectares: '',
  altitude_masl: '',
  latitude: '',
  longitude: '',
};
