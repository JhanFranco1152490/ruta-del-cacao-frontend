import { z } from 'zod';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import type { ExitInput, Grade } from './api';
import { type ExitableGrade, exitQuantityIssue } from './exit-quantity';
import {
  DETAIL_MAX_LENGTH,
  exitDetailIssue,
  MANUAL_EXIT_REASONS,
  type ManualExitReason,
} from './exit-reasons';
import { exitDateIssue } from './warehouse-dates';

export type ExitFormInput = {
  grade: Grade | '';
  quantity_kg: string;
  exit_date: string;
  reason: ManualExitReason | '';
  detail: string;
};

// La cantidad se compara con lo disponible del calibre elegido, y la fecha con hoy y con el día del
// ingreso: por eso el esquema se arma para el lote.
export const createExitFormSchema = (context: {
  today: string;
  enteredOn: string;
  grades: readonly ExitableGrade[];
}) =>
  z
    .object({
      grade: z.union([z.literal(''), z.enum(['g1', 'g2'])]),
      quantity_kg: z.string(),
      exit_date: z.string().superRefine((date, issues) => {
        const message = exitDateIssue(date, context);
        if (message) issues.addIssue({ code: 'custom', message });
      }),
      reason: z.union([z.literal(''), z.enum(MANUAL_EXIT_REASONS)]),
      detail: z
        .string()
        .trim()
        .max(DETAIL_MAX_LENGTH, `Máximo ${DETAIL_MAX_LENGTH} caracteres.`),
    })
    .superRefine((values, issues) => {
      const add = (path: keyof ExitFormInput, message: string) =>
        issues.addIssue({ code: 'custom', path: [path], message });
      if (!values.grade) add('grade', REQUIRED_FIELD_MESSAGE);
      if (!values.reason) add('reason', REQUIRED_FIELD_MESSAGE);
      // Sin calibre elegido no hay contra qué comparar: basta con que la cantidad esté escrita.
      const available =
        context.grades.find(({ grade }) => grade === values.grade)
          ?.availableTenths ?? Number.POSITIVE_INFINITY;
      const quantity = exitQuantityIssue(values.quantity_kg, available);
      if (quantity) add('quantity_kg', quantity);
      const detail = exitDetailIssue(values.reason, values.detail);
      if (detail) add('detail', detail);
    });

// Hoy, y el calibre propuesto (el de la fila desde la que se abrió) o el único que tiene kilos.
export function exitFormOf({
  today,
  grades,
  proposed,
}: {
  today: string;
  grades: readonly ExitableGrade[];
  proposed?: Grade;
}): ExitFormInput {
  const offered = grades.map(({ grade }) => grade);
  const grade =
    proposed && offered.includes(proposed)
      ? proposed
      : offered.length === 1
        ? offered[0]
        : '';
  return { grade, quantity_kg: '', exit_date: today, reason: '', detail: '' };
}

// La API recibe la cantidad con punto decimal.
export const toExitRequest = (values: ExitFormInput): ExitInput => ({
  grade: values.grade as Grade,
  quantity_kg: values.quantity_kg.trim().replace(',', '.'),
  exit_date: values.exit_date,
  reason: values.reason as ManualExitReason,
  detail: values.detail.trim(),
});

export const EXIT_SAVED = 'Salida registrada.';
