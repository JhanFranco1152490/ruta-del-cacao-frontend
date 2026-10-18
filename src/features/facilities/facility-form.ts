import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { FACILITY_TYPE_ORDER, type FacilityType } from '@/lib/facility-labels';
import { formatDecimal } from '@/lib/format/decimal';
import { normalizeCatalogName } from '@/lib/format/search';
import {
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import type { PostharvestFacility } from './api';

type Schemas = components['schemas'];

export const FACILITY_NAME_MAX_LENGTH = 40;
// Un decimal, como el peso de la cosecha: la API rechaza más precisión. El tope atrapa un cero de
// más (un cajón ronda los 300 a 1.000 kg).
export const CAPACITY_DECIMALS = 1;
export const MAX_CAPACITY_KG = 10_000;

// «600 kg», «12,5 kg»: sin el cero decimal y con la coma del español.
export const capacityText = (kg: string) =>
  `${formatDecimal(kg, CAPACITY_DECIMALS)} kg`;

export const FACILITY_SAVED_MESSAGE = 'Elemento registrado';
export const FACILITY_UPDATED_MESSAGE = 'Elemento actualizado';
export const STALE_FACILITY_MESSAGE =
  'Otra persona cambió este elemento. Revisa los datos actuales antes de guardar.';
export const TYPE_LOCKED_HINT =
  'No se puede cambiar: el elemento ya se usó en un proceso. Si te equivocaste, desactívalo y registra otro.';
export const FARM_INACTIVE_MESSAGE =
  'La finca está inactiva: no se registran cajones ni marquesinas en ella.';

// Lo que tiene el formulario mientras se escribe: los campos vacíos son texto vacío.
export type FacilityFormInput = {
  facility_type: FacilityType | '' | null;
  name: string;
  farm_id: string;
  capacity_kg: string;
};

// La capacidad viaja como texto decimal con punto («12.5»), como la entrega la API.
export type FacilityFormValues = {
  facility_type: FacilityType;
  name: string;
  farm_id: string;
  capacity_kg: string;
};

// Acepta coma o punto: el teclado en español suele escribir la coma.
const capacityField = decimalText().superRefine((text, context) => {
  const issue = (message: string) =>
    context.addIssue({ code: 'custom', message });
  if (!text) return issue(REQUIRED_FIELD_MESSAGE);
  if (!isDecimal(text)) return issue('Escribe la capacidad en kilos.');
  const kilos = Number(text);
  if (kilos <= 0) return issue('Debe ser mayor que cero');
  if (kilos > MAX_CAPACITY_KG) {
    return issue('La capacidad supera 10.000 kg. Revisa la cifra.');
  }
  if (!decimalPattern(CAPACITY_DECIMALS).test(text)) {
    issue('Usa máximo 1 decimal.');
  }
});

// El nombre no se repite en la finca, sin importar el tipo, y se compara sin mayúsculas, tildes,
// espacios ni guiones, como lo compara el servidor: «c 02» y «C-02» son el mismo. La respuesta del
// servidor manda; esto solo avisa antes de enviar con los que hay en el dispositivo.
export function createFacilityFormSchema({
  known,
  editingId,
  farmName,
}: {
  known: readonly PostharvestFacility[];
  editingId?: string;
  farmName: (farmId: string) => string;
}) {
  return z
    .object({
      facility_type: z
        // Con ninguna tarjeta marcada, el formulario entrega `null` y no texto vacío.
        .union([
          z.literal(''),
          z.null(),
          z.enum(FACILITY_TYPE_ORDER as [FacilityType, ...FacilityType[]]),
        ])
        .refine((value) => !!value, REQUIRED_FIELD_MESSAGE)
        .transform((value) => value as FacilityType),
      name: z
        .string()
        .trim()
        .min(1, REQUIRED_FIELD_MESSAGE)
        .max(FACILITY_NAME_MAX_LENGTH, 'Máximo 40 caracteres.'),
      farm_id: z.string().min(1, REQUIRED_FIELD_MESSAGE),
      capacity_kg: capacityField,
    })
    .superRefine(({ name, farm_id }, context) => {
      const duplicate = findDuplicateFacility(known, name, farm_id, editingId);
      if (duplicate) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: duplicateMessage(duplicate.name, farmName(farm_id)),
        });
      }
    });
}

export const duplicateMessage = (name: string, farmName: string) =>
  `Ya existe ${name} en ${farmName}.`;

export function findDuplicateFacility(
  known: readonly PostharvestFacility[],
  name: string,
  farmId: string,
  ignoreId?: string,
) {
  const key = normalizeCatalogName(name);
  if (!key || !farmId) return undefined;
  return known.find(
    (other) =>
      other.id !== ignoreId &&
      other.farm.id === farmId &&
      normalizeCatalogName(other.name) === key,
  );
}

export const facilityFormValuesOf = (
  facility: PostharvestFacility | undefined,
  farmId: string,
): FacilityFormInput => ({
  facility_type: facility?.facility_type ?? '',
  name: facility?.name ?? '',
  farm_id: facility?.farm.id ?? farmId,
  // «600.0» se escribe 600: el cero decimal no dice nada.
  capacity_kg: facility ? String(Number(facility.capacity_kg)) : '',
});

export const toCreateRequest = (
  values: FacilityFormValues,
): Schemas['PostharvestFacilityCreateRequest'] => ({
  farm_id: values.farm_id,
  facility_type: values.facility_type,
  name: values.name,
  capacity_kg: values.capacity_kg,
});

// Solo lo que cambió, y nunca la finca: no se edita. Sin cambios devuelve `null` y no se envía nada.
export function toUpdateRequest(
  values: FacilityFormValues,
  facility: PostharvestFacility,
) {
  const changes: {
    name?: string;
    capacity_kg?: string;
    facility_type?: FacilityType;
  } = {};
  if (values.name !== facility.name) changes.name = values.name;
  // Se comparan las cifras: «600» y «600.0» son la misma capacidad.
  if (Number(values.capacity_kg) !== Number(facility.capacity_kg)) {
    changes.capacity_kg = values.capacity_kg;
  }
  if (values.facility_type !== facility.facility_type) {
    changes.facility_type = values.facility_type;
  }
  return Object.keys(changes).length > 0 ? changes : null;
}
