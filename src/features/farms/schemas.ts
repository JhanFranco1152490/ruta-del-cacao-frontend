import { z } from 'zod';

// Los límites de decimales coinciden con los que guarda la API: más precisión la rechaza.
const COORDINATE_DECIMALS = 7;
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

const requiredCoordinate = (minimum: number, maximum: number) =>
  decimalText()
    .refine((value) => value !== '', 'La georreferenciación es obligatoria')
    .refine(
      (value) =>
        value === '' ||
        (isDecimal(value) &&
          Number(value) >= minimum &&
          Number(value) <= maximum),
      'Coordenadas no válidas',
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
  department_id: z.string().min(1, 'Selecciona un departamento.'),
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
  latitude: requiredCoordinate(-90, 90),
  longitude: requiredCoordinate(-180, 180),
});

export type FarmFormValues = z.infer<typeof farmFormSchema>;

export const FARM_FORM_FIELDS = Object.keys(farmFormSchema.shape);

export const emptyFarmForm: FarmFormValues = {
  name: '',
  department_id: '',
  municipality_id: '',
  details: '',
  area_hectares: '',
  altitude_masl: '',
  latitude: '',
  longitude: '',
};
