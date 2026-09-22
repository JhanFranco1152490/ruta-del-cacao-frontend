import type { ProducerInput } from './types';

export type ProducerFieldErrors = Partial<Record<keyof ProducerInput, string>>;

export function normalizeIdentityDocument(value: string) {
  return value.trim();
}

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

export function validateProducer(input: ProducerInput): ProducerFieldErrors {
  const errors: ProducerFieldErrors = {};

  if (
    !/^[0-9]{6,15}$/.test(normalizeIdentityDocument(input.identity_document))
  ) {
    errors.identity_document =
      'Ingresa solo números, con una longitud entre 6 y 15 dígitos.';
  }

  if (!input.first_name.trim()) {
    errors.first_name = 'Ingresa los nombres.';
  }

  if (!input.last_name.trim()) {
    errors.last_name = 'Ingresa los apellidos.';
  }

  if (!input.municipality_code) {
    errors.municipality_code = 'Selecciona un municipio.';
  }

  if (!input.joined_on) {
    errors.joined_on = 'Ingresa la fecha de vinculación.';
  } else if (input.joined_on > dateInBogota()) {
    errors.joined_on = 'La fecha no puede ser posterior a hoy.';
  }

  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = 'Ingresa un correo electrónico válido.';
  }

  if (input.phone) {
    const digits = input.phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      errors.phone = 'El teléfono debe tener entre 7 y 15 dígitos.';
    }
  }

  return errors;
}
