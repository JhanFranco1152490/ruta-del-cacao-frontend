import { z } from 'zod';

import { DOCUMENT_TYPES } from '@/lib/document-types';
import { todayInBogota } from '@/lib/format/dates';
import { isEmail } from '@/lib/validation/is-email';

import type { Producer, ProducerRequest } from './api';

export const producerFormSchema = z.object({
  document_type: z.enum(DOCUMENT_TYPES),
  identity_document: z
    .string()
    .trim()
    .regex(/^[0-9]{6,15}$/, 'Ingresa solo números, entre 6 y 15 dígitos.'),
  first_name: z.string().trim().min(1, 'Ingresa los nombres.').max(100),
  last_name: z.string().trim().min(1, 'Ingresa los apellidos.').max(100),
  // En el formulario los opcionales vacíos son '' y se envían como null.
  phone: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^[0-9]{7,10}$/.test(value),
      'El teléfono debe tener entre 7 y 10 dígitos.',
    ),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || isEmail(value),
      'Ingresa un correo electrónico válido.',
    ),
  municipality_code: z.string().min(1, 'Selecciona un municipio.'),
  joined_on: z
    .string()
    .min(1, 'Ingresa la fecha de vinculación.')
    .refine(
      (value) => value <= todayInBogota(),
      'La fecha no puede ser posterior a hoy.',
    ),
});

export type ProducerFormValues = z.infer<typeof producerFormSchema>;

export const PRODUCER_FORM_FIELDS = Object.keys(producerFormSchema.shape);

export const emptyProducerForm: ProducerFormValues = {
  document_type: 'CC',
  identity_document: '',
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  municipality_code: '',
  joined_on: '',
};

export const toFormValues = (producer: Producer): ProducerFormValues => ({
  document_type: producer.document_type,
  identity_document: producer.identity_document,
  first_name: producer.first_name,
  last_name: producer.last_name,
  phone: producer.phone ?? '',
  email: producer.email ?? '',
  municipality_code: producer.municipality_code,
  joined_on: producer.joined_on,
});

export const toProducerRequest = (
  values: ProducerFormValues,
): ProducerRequest => ({
  document_type: values.document_type,
  identity_document: values.identity_document.trim(),
  first_name: values.first_name.trim(),
  last_name: values.last_name.trim(),
  phone: values.phone.trim() || null,
  email: values.email.trim().toLowerCase() || null,
  municipality_code: values.municipality_code,
  joined_on: values.joined_on,
});
