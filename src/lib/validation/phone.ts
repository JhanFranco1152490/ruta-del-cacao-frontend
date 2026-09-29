import { z } from 'zod';

export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || /^[0-9]{7,10}$/.test(value),
    'El teléfono debe tener entre 7 y 10 dígitos.',
  );
