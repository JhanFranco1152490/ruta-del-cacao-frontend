import { z } from 'zod';

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

function isDecimalInRange(value: string, minimum: number, maximum: number) {
  return (
    DECIMAL_PATTERN.test(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

const requiredCoordinate = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, 'La georreferenciación es obligatoria')
    .refine(
      (value) => value === '' || isDecimalInRange(value, minimum, maximum),
      'Coordenadas no válidas',
    );

export const farmFormSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre de la finca.'),
  department_id: z.string().min(1, 'Selecciona un departamento.'),
  municipality_id: z.string().min(1, 'Selecciona un municipio.'),
  details: z.string().trim(),
  area_hectares: z
    .string()
    .trim()
    .refine(
      (value) => DECIMAL_PATTERN.test(value) && Number(value) > 0,
      'El área debe ser mayor a 0',
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
