import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { todayInBogota } from '@/lib/format/dates';
import { decimalPattern, isDecimal } from '@/lib/validation/decimal';

import { REQUIRED_FIELD_MESSAGE } from './schemas';
import { packagesToUnit } from './stock-format';

// Lo máximo que guarda el servidor por movimiento (12 dígitos con 3 decimales).
const MAX_QUANTITY = 9_999_999.999;
const QUANTITY_DECIMALS = 3;
export const NOTE_MAX_LENGTH = 200;

export type AmountIn = 'packages' | 'unit';

export type MovementFormInput = {
  occurred_on: string;
  amount: string;
  amount_in: AmountIn;
  note: string;
};

type InputPackage = { package_size: string } | null;

const normalizeAmount = (amount: string) => amount.trim().replace(',', '.');

// Lo escrito, en la unidad del insumo: en empaques se multiplica por su contenido. Sin
// presentación solo existe la unidad. Es también lo que el diálogo muestra debajo ("= 300 mL").
export function amountInUnit(
  amount: string,
  amountIn: AmountIn,
  inputPackage: InputPackage,
): string | null {
  const value = normalizeAmount(amount);
  if (!isDecimal(value)) return null;
  if (amountIn === 'packages' && inputPackage) {
    return packagesToUnit(value, inputPackage.package_size);
  }
  return value;
}

type Kind = 'entry' | 'count';

function amountError(kind: Kind, amount: string, inUnit: string | null) {
  const value = normalizeAmount(amount);
  if (!value) return REQUIRED_FIELD_MESSAGE;
  if (inUnit === null) return 'Escribe una cantidad válida.';
  const number = Number(value);
  if (kind === 'entry' && number <= 0) {
    return 'La cantidad debe ser mayor que cero.';
  }
  if (kind === 'count' && number < 0) {
    return 'La cantidad no puede ser negativa.';
  }
  if (!decimalPattern(QUANTITY_DECIMALS).test(value)) {
    return `Usa máximo ${QUANTITY_DECIMALS} decimales.`;
  }
  if (Number(inUnit) > MAX_QUANTITY) return 'La cantidad es demasiado grande.';
  return null;
}

const createMovementSchema = (kind: Kind, inputPackage: InputPackage) =>
  z
    .object({
      occurred_on: z.string(),
      amount: z.string(),
      amount_in: z.enum(['packages', 'unit']),
      note: z.string().trim(),
    })
    .superRefine(({ occurred_on, amount, amount_in, note }, context) => {
      const issue = (path: string, message: string) =>
        context.addIssue({ code: 'custom', path: [path], message });
      if (!occurred_on) issue('occurred_on', REQUIRED_FIELD_MESSAGE);
      else if (occurred_on > todayInBogota()) {
        issue('occurred_on', 'La fecha no puede ser posterior a hoy.');
      }
      const inUnit = amountInUnit(amount, amount_in, inputPackage);
      const error = amountError(kind, amount, inUnit);
      if (error) issue('amount', error);
      if (note.length > NOTE_MAX_LENGTH) {
        issue('note', `Usa máximo ${NOTE_MAX_LENGTH} caracteres.`);
      }
    })
    .transform(({ occurred_on, amount, amount_in, note }) => ({
      occurred_on,
      // Ya validado: la conversión no devuelve null aquí.
      amount: amountInUnit(amount, amount_in, inputPackage) as string,
      note,
    }));

export const createEntrySchema = (inputPackage: InputPackage) =>
  createMovementSchema('entry', inputPackage).transform(
    ({ amount, ...values }) => ({ ...values, quantity: amount }),
  );

export const createCountSchema = (inputPackage: InputPackage) =>
  createMovementSchema('count', inputPackage).transform(
    ({ amount, ...values }) => ({ ...values, counted_quantity: amount }),
  );

export type EntryValues = z.output<ReturnType<typeof createEntrySchema>>;
export type CountValues = z.output<ReturnType<typeof createCountSchema>>;

type MovementContext = { id: string; inputId: string; farmId: string };

// El `id` lo genera el diálogo al abrirse y no cambia mientras está abierto: un doble clic o un
// reintento tras perder la respuesta llega con el mismo y el servidor no registra dos veces.
export function buildMovementRequest(
  { id, inputId, farmId }: MovementContext,
  kind: 'entry' | 'count',
  values: EntryValues | CountValues,
): components['schemas']['InputMovementCreateRequest'] {
  return { id, input_id: inputId, farm_id: farmId, kind, ...values };
}
