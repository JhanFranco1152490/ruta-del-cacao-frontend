import { z } from 'zod';

import { COORDINATE_DECIMALS } from '@/lib/format/coordinates';
import { altitudeRangeFor } from '@/lib/geo/municipality-altitude';
import { OPERATING_AREA_BOUNDS } from '@/lib/geo/operating-area';
import {
  areaHectaresField,
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';

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

export type FarmSchemaOptions = {
  // El área que ya tienen asignada las parcelas activas de la finca que se edita. El área de la
  // finca no puede quedar por debajo (el servidor también lo rechaza).
  allocatedHectares?: number;
  // Cómo se llama un municipio, para decirlo en el mensaje de la altitud.
  municipalityName?: (code: string) => string | undefined;
  // El municipio y la altitud con los que la finca ya estaba guardada. Si no cambian, no se
  // vuelve a exigir que la altitud quepa en el terreno: una finca guardada antes de esa regla
  // debe poder seguir editando sus otros datos (el servidor hace lo mismo).
  saved?: { municipalityCode: string; altitude: string };
  // La cuenta técnica no tiene un productor propio: al crear una finca elige de cuál es.
  requireProducer?: boolean;
};

export const createFarmFormSchema = ({
  allocatedHectares = 0,
  municipalityName,
  saved,
  requireProducer = false,
}: FarmSchemaOptions = {}) =>
  z
    .object({
      // Solo al crear una finca la cuenta técnica; para cualquier otra, el servidor usa el productor
      // de la sesión.
      producer_id: z.string().optional(),
      name: z.string().trim().min(1, 'Ingresa el nombre de la finca.'),
      municipality_id: z.string().min(1, 'Selecciona un municipio.'),
      details: z.string().trim(),
      area_hectares: areaHectaresField(),
      altitude_masl: z
        .string()
        .trim()
        .refine(
          (value) =>
            /^-?\d+$/.test(value) &&
            Number(value) >= -500 &&
            Number(value) <= 9000,
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
    })
    .superRefine((values, context) => {
      if (requireProducer && !values.producer_id) {
        context.addIssue({
          code: 'custom',
          path: ['producer_id'],
          message: 'Elige el productor de la finca.',
        });
      }
    })
    .superRefine((values, context) => {
      // La altitud también tiene que caber en el terreno del municipio elegido. Si no hay altitud
      // válida o municipio todavía, ya lo dicen sus propios campos.
      const range = altitudeRangeFor(values.municipality_id);
      const altitude = Number(values.altitude_masl);
      if (!range || !/^-?\d+$/.test(values.altitude_masl.trim())) return;
      const unchanged =
        saved?.municipalityCode === values.municipality_id &&
        saved.altitude.trim() === values.altitude_masl.trim();
      if (unchanged) return;
      if (altitude < range.minimum || altitude > range.maximum) {
        const name = municipalityName?.(values.municipality_id);
        context.addIssue({
          code: 'custom',
          path: ['altitude_masl'],
          message: `La altitud no corresponde ${name ? `a ${name}` : 'al municipio elegido'}: el terreno del municipio va de ${range.minimum} a ${range.maximum} m.`,
        });
      }
    })
    .superRefine((values, context) => {
      const area = Number(values.area_hectares);
      if (
        allocatedHectares > 0 &&
        Number.isFinite(area) &&
        area > 0 &&
        area < allocatedHectares
      ) {
        context.addIssue({
          code: 'custom',
          path: ['area_hectares'],
          message: `Sus parcelas activas ya ocupan ${allocatedHectares} ha: el área de la finca no puede ser menor. Déjala en ${allocatedHectares} ha o más, o reduce o desactiva parcelas primero.`,
        });
      }
    });

export const farmFormSchema = createFarmFormSchema();

export type FarmFormValues = z.infer<typeof farmFormSchema>;

// Los campos que son de la finca misma: `producer_id` no, porque una finca no cambia de dueño y
// por eso no se compara ni se reenvía al corregir.
export type FarmContentField = Exclude<keyof FarmFormValues, 'producer_id'>;

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
