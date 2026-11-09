import { z } from 'zod';

import { fromTenths, sumTenths } from '@/lib/format/tenths';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import type { Sale } from './api';
import { VOID_REASON_MAX_LENGTH } from './sale-limits';

export const voidFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, REQUIRED_FIELD_MESSAGE)
    .max(
      VOID_REASON_MAX_LENGTH,
      `Máximo ${VOID_REASON_MAX_LENGTH} caracteres.`,
    ),
});

export type VoidFormInput = z.input<typeof voidFormSchema>;

// Los kilos de toda la venta, G1 y G2 juntos: los que vuelven a bodega al anularla.
export const saleKilos = (sale: Pick<Sale, 'g1_kg' | 'g2_kg'>) =>
  fromTenths(sumTenths([sale.g1_kg, sale.g2_kg]));
