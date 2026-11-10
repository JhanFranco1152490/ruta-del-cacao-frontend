import { z } from 'zod';

import type { StockExit } from './api';
import { GRADE_LABELS, kilosText } from '@/lib/stock-quantity';
import { DETAIL_MAX_LENGTH } from './exit-reasons';

// El mismo texto que el servidor.
export const VOID_REASON_REQUIRED_MESSAGE = 'Indique el motivo de la anulación';

export const voidFormSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, VOID_REASON_REQUIRED_MESSAGE)
    .max(DETAIL_MAX_LENGTH, `Máximo ${DETAIL_MAX_LENGTH} caracteres.`),
});

export type VoidFormInput = z.input<typeof voidFormSchema>;

// «¿Anular la salida de 5,0 kg de G1?»: lo que se deshace, dicho con sus números.
export const voidQuestion = (exit: Pick<StockExit, 'quantity_kg' | 'grade'>) =>
  `¿Anular la salida de ${kilosText(exit.quantity_kg)} kg de ${GRADE_LABELS[exit.grade]}?`;

export const VOID_CONSEQUENCE = 'Los kilos vuelven a las existencias.';
export const EXIT_VOIDED = 'Salida anulada.';
