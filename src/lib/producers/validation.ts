import { z } from 'zod';

import { documentTypes, type ProducerInput } from './types';

function dateInBogota() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

function isValidPhone(value: string | null) {
  if (!value) return true;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(value: string | null) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const producerFormSchema = z.object({
  document_type: z.enum(documentTypes),
  identity_document: z
    .string()
    .trim()
    .regex(/^[0-9]{6,15}$/, 'Ingresa solo números, entre 6 y 15 dígitos.'),
  first_name: z.string().trim().min(1, 'Ingresa los nombres.'),
  last_name: z.string().trim().min(1, 'Ingresa los apellidos.'),
  phone: z
    .string()
    .nullable()
    .refine(isValidPhone, 'El teléfono debe tener entre 7 y 15 dígitos.'),
  email: z
    .string()
    .nullable()
    .refine(isValidEmail, 'Ingresa un correo electrónico válido.'),
  municipality_code: z.string().min(1, 'Selecciona un municipio.'),
  joined_on: z
    .string()
    .min(1, 'Ingresa la fecha de vinculación.')
    .refine(
      (value) => !value || value <= dateInBogota(),
      'La fecha no puede ser posterior a hoy.',
    ),
});

export function normalizeProducerInput(input: ProducerInput): ProducerInput {
  return {
    ...input,
    identity_document: input.identity_document.trim(),
    first_name: input.first_name.trim(),
    last_name: input.last_name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
  };
}
