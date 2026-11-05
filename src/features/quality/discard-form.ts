import { z } from 'zod';

import type { DiscardInput, DiscardReason } from './api';
import {
  DETAIL_MAX_LENGTH,
  discardReasonField,
  discardReasonIssue,
} from './discard-reasons';

export type DiscardFormInput = { reason: DiscardReason | ''; detail: string };

export const discardFormSchema = z
  .object({
    reason: discardReasonField,
    detail: z
      .string()
      .trim()
      .max(DETAIL_MAX_LENGTH, `Máximo ${DETAIL_MAX_LENGTH} caracteres.`),
  })
  .superRefine((values, context) => {
    const issue = discardReasonIssue(values.reason, values.detail);
    if (issue) {
      context.addIssue({
        code: 'custom',
        path: [issue.field],
        message: issue.message,
      });
    }
  });

export const emptyDiscardForm = (): DiscardFormInput => ({
  reason: '',
  detail: '',
});

export const toDiscardRequest = (
  values: DiscardFormInput,
  expectedLotVersion: number,
): DiscardInput => ({
  expected_lot_version: expectedLotVersion,
  reason: values.reason,
  detail: values.detail,
});

export const discardConfirmMessage = (code: string) =>
  `¿Descartar el lote ${code}? Esta acción no se puede deshacer. El lote no podrá clasificarse, ingresar a bodega ni venderse.`;
