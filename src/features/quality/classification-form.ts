import { z } from 'zod';

import { formatFixedDecimal } from '@/lib/format/decimal';
import {
  decimalPattern,
  decimalText,
  isDecimal,
} from '@/lib/validation/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { ONE_DECIMAL_MESSAGE } from '@/lib/validation/percent';

import type { ClassificationInput, DiscardReason } from './api';
import { DETAIL_MAX_LENGTH, discardReasonIssue } from './discard-reasons';
import { fromTenths, sumTenths, toTenths } from './tenths';

export const NEGATIVE_KILOS_MESSAGE = 'No puede ser negativo.';

export type ClassificationFormInput = {
  g1_kg: string;
  g2_kg: string;
  discard_kg: string;
  discard_reason: DiscardReason | '';
  discard_detail: string;
};

const kilosField = decimalText().superRefine((text, context) => {
  const issue = (message: string) =>
    context.addIssue({ code: 'custom', message });
  if (!text) return issue(REQUIRED_FIELD_MESSAGE);
  if (!isDecimal(text) || Number(text) < 0) {
    return issue(NEGATIVE_KILOS_MESSAGE);
  }
  if (!decimalPattern(1).test(text)) issue(ONE_DECIMAL_MESSAGE);
});

export const hasDiscard = (discardKg: string) => (toTenths(discardKg) ?? 0) > 0;

// El motivo se pide solo con kilos de descarte, y el detalle solo con Otro. La suma contra el peso
// seco no es un error de campo: deshabilita el botón y se lee debajo (`classificationBalance`).
export const classificationFormSchema = z
  .object({
    g1_kg: kilosField,
    g2_kg: kilosField,
    discard_kg: kilosField,
    discard_reason: z.string(),
    discard_detail: z
      .string()
      .trim()
      .max(DETAIL_MAX_LENGTH, `Máximo ${DETAIL_MAX_LENGTH} caracteres.`),
  })
  .superRefine((values, context) => {
    if (!hasDiscard(values.discard_kg)) return;
    const issue = discardReasonIssue(
      values.discard_reason,
      values.discard_detail,
    );
    if (issue) {
      context.addIssue({
        code: 'custom',
        path: [issue.field === 'reason' ? 'discard_reason' : 'discard_detail'],
        message: issue.message,
      });
    }
  });

// El descarte empieza en 0: lo más común es repartir todo entre G1 y G2.
export const emptyClassificationForm = (): ClassificationFormInput => ({
  g1_kg: '',
  g2_kg: '',
  discard_kg: '0',
  discard_reason: '',
  discard_detail: '',
});

const kilos = (tenths: number) => formatFixedDecimal(fromTenths(tenths), 1);

// Lo repartido contra el peso seco mientras se escribe: «Distribuido: 300,0 de 313,2 kg» y «Faltan
// 13,2 kg por distribuir» o «Sobran 4,8 kg». Solo se guarda con la diferencia en cero.
export function classificationBalance(
  values: Pick<ClassificationFormInput, 'g1_kg' | 'g2_kg' | 'discard_kg'>,
  dryWeightKg: string,
) {
  const expected = toTenths(dryWeightKg) ?? 0;
  const distributed = sumTenths([
    values.g1_kg,
    values.g2_kg,
    values.discard_kg,
  ]);
  const difference = expected - distributed;
  return {
    distributedLine: `Distribuido: ${kilos(distributed)} de ${kilos(expected)} kg`,
    differenceLine:
      difference === 0
        ? null
        : difference > 0
          ? `Faltan ${kilos(difference)} kg por distribuir`
          : `Sobran ${kilos(-difference)} kg`,
    balanced: difference === 0,
  };
}

// Sin kilos de descarte no se envía motivo ni detalle: el servidor rechaza un motivo sin descarte.
export function toClassificationRequest(
  values: ClassificationFormInput,
  expectedLotVersion: number,
): ClassificationInput {
  const reason = hasDiscard(values.discard_kg) ? values.discard_reason : '';
  return {
    expected_lot_version: expectedLotVersion,
    g1_kg: values.g1_kg,
    g2_kg: values.g2_kg,
    discard_kg: values.discard_kg,
    discard_reason: reason,
    discard_detail: reason ? values.discard_detail : '',
  };
}
