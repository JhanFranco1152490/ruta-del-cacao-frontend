import { z } from 'zod';

import { areaHectaresField } from '@/lib/validation/decimal';

export const PLOT_CODE_MAX_LENGTH = 50;

// La misma forma con la que el servidor compara los códigos: sin espacios a los lados ni
// distinción de mayúsculas. Dos códigos que solo difieren en eso son el mismo.
export const normalizeCode = (code: string) =>
  code.trim().normalize('NFKC').toLowerCase();

export const DUPLICATE_CODE_MESSAGE =
  'Ya existe una parcela con este código en la finca';

// `takenCodes`: los códigos (ya normalizados) de las demás parcelas de la finca que conoce el
// dispositivo. El servidor repite la comprobación con todas.
export const createPlotFormSchema = (takenCodes: ReadonlySet<string>) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, 'Ingresa el código de la parcela.')
      .max(
        PLOT_CODE_MAX_LENGTH,
        `Usa máximo ${PLOT_CODE_MAX_LENGTH} caracteres.`,
      )
      .refine(
        (code) => !takenCodes.has(normalizeCode(code)),
        DUPLICATE_CODE_MESSAGE,
      ),
    area_hectares: areaHectaresField(),
  });

export type PlotFormFields = z.infer<ReturnType<typeof createPlotFormSchema>>;
