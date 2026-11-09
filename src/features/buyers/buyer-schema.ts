import { z } from 'zod';

import { DOCUMENT_TYPES } from '@/lib/document-types';
import {
  IDENTITY_DOCUMENT_MESSAGE,
  IDENTITY_DOCUMENT_PATTERN,
} from '@/lib/validation/identity-document';
import { isEmail } from '@/lib/validation/is-email';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { optionalPhoneSchema } from '@/lib/validation/phone';

import { BUYER_TYPES } from '@/lib/buyer-types';

export const BUYER_NAME_MIN_LENGTH = 2;
export const BUYER_NAME_MAX_LENGTH = 120;
export const BUYER_EMAIL_MAX_LENGTH = 254;

export const CONTACT_REQUIRED_MESSAGE = 'Escribe un teléfono o un correo.';
const MIN_LENGTH_MESSAGE = `Escribe al menos ${BUYER_NAME_MIN_LENGTH} caracteres.`;
const MAX_LENGTH_MESSAGE = `Usa máximo ${BUYER_NAME_MAX_LENGTH} caracteres.`;

const nameSchema = z
  .string()
  .trim()
  .min(1, REQUIRED_FIELD_MESSAGE)
  .min(BUYER_NAME_MIN_LENGTH, MIN_LENGTH_MESSAGE)
  .max(BUYER_NAME_MAX_LENGTH, MAX_LENGTH_MESSAGE);

// La persona de contacto es opcional, pero si se escribe sigue los mismos largos que el nombre.
const contactNameSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || value.length >= BUYER_NAME_MIN_LENGTH,
    MIN_LENGTH_MESSAGE,
  )
  .refine((value) => value.length <= BUYER_NAME_MAX_LENGTH, MAX_LENGTH_MESSAGE);

const emailSchema = z
  .string()
  .trim()
  .max(
    BUYER_EMAIL_MAX_LENGTH,
    `Usa máximo ${BUYER_EMAIL_MAX_LENGTH} caracteres.`,
  )
  .refine(
    (value) => value === '' || isEmail(value),
    'Ingresa un correo electrónico válido.',
  );

// `producer_id` solo lo llena la cuenta técnica, que no tiene un productor propio; para ella es
// obligatorio. Las demás cuentas registran en el suyo y lo dejan vacío.
export const buyerFormSchema = ({ needsProducer = false } = {}) =>
  z
    .object({
      producer_id: z.string(),
      name: nameSchema,
      document_type: z.enum(DOCUMENT_TYPES),
      identity_document: z
        .string()
        .trim()
        .min(1, REQUIRED_FIELD_MESSAGE)
        .regex(IDENTITY_DOCUMENT_PATTERN, IDENTITY_DOCUMENT_MESSAGE),
      // Vacío mientras no se elige: la lista muestra su texto de ayuda, no una opción.
      buyer_type: z
        .union([z.enum(BUYER_TYPES), z.literal('')])
        .refine((value) => value !== '', REQUIRED_FIELD_MESSAGE),
      contact_name: contactNameSchema,
      phone: optionalPhoneSchema,
      email: emailSchema,
    })
    .superRefine((values, context) => {
      if (needsProducer && !values.producer_id) {
        context.addIssue({
          code: 'custom',
          path: ['producer_id'],
          message: REQUIRED_FIELD_MESSAGE,
        });
      }
      // El contacto es obligatorio, pero basta uno de los dos: un acopiador puede no usar correo.
      if (!values.phone.trim() && !values.email.trim()) {
        for (const field of ['phone', 'email'] as const) {
          context.addIssue({
            code: 'custom',
            path: [field],
            message: CONTACT_REQUIRED_MESSAGE,
          });
        }
      }
    });

export type BuyerFormInput = z.input<ReturnType<typeof buyerFormSchema>>;
export type BuyerFormValues = z.output<ReturnType<typeof buyerFormSchema>>;

// Los campos que el formulario muestra: los errores del servidor de otro campo van arriba.
export const BUYER_FORM_FIELDS = [
  'producer_id',
  'name',
  'document_type',
  'identity_document',
  'buyer_type',
  'contact_name',
  'phone',
  'email',
] as const satisfies readonly (keyof BuyerFormInput)[];
