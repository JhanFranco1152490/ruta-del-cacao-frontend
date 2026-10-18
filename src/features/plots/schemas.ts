import { z } from 'zod';

import { areaHectaresField } from '@/lib/validation/decimal';

export const PLOT_NAME_MAX_LENGTH = 60;

// La misma forma con la que el servidor compara los nombres: sin espacios a los lados ni
// distinción de mayúsculas. Dos nombres que solo difieren en eso son el mismo.
export const normalizeName = (name: string) =>
  name.trim().normalize('NFKC').toLowerCase();

export const DUPLICATE_NAME_MESSAGE =
  'Ya existe una parcela con este nombre en la finca';

// `takenNames`: los nombres (ya normalizados) de las demás parcelas de la finca que conoce el
// dispositivo. El servidor repite la comprobación con todas. El nombre es opcional: el código lo
// asigna el servidor, y varias parcelas sin nombre conviven.
export const createPlotFormSchema = (takenNames: ReadonlySet<string>) =>
  z.object({
    name: z
      .string()
      .trim()
      .max(
        PLOT_NAME_MAX_LENGTH,
        `Usa máximo ${PLOT_NAME_MAX_LENGTH} caracteres.`,
      )
      .refine(
        (name) => !name || !takenNames.has(normalizeName(name)),
        DUPLICATE_NAME_MESSAGE,
      ),
    area_hectares: areaHectaresField(),
  });

export type PlotFormFields = z.infer<ReturnType<typeof createPlotFormSchema>>;
