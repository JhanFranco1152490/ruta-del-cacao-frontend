import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { dateInBogota, formatLongDate, isIsoDate } from '@/lib/format/dates';
import {
  formatQuantity,
  formatStock,
  inputPackageOf,
} from '@/lib/format/input-quantity';
import { decimalPattern, isDecimal } from '@/lib/validation/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import { activityTitle } from './activity-labels';
import type { AgriculturalActivity } from './api';

type Schemas = components['schemas'];

// Lo máximo que guarda el servidor por insumo usado (10 dígitos con 3 decimales).
const MAX_QUANTITY = 9_999_999.999;
const QUANTITY_DECIMALS = 3;

export const FUTURE_DATE_MESSAGE = 'La fecha no puede ser futura';
export const MISSING_QUANTITY_MESSAGE = 'Indique la cantidad del insumo';
export const REPEATED_INPUT_MESSAGE = 'Este insumo ya está en la lista';

export type CompletionFormInput = {
  done_date: string;
  inputs: { input_id: string; quantity: string }[];
};

// El teclado en español suele escribir la coma decimal; la API espera el punto.
const normalizeQuantity = (quantity: string) =>
  quantity.trim().replace(',', '.');

function quantityError(quantity: string): string | null {
  if (!quantity) return MISSING_QUANTITY_MESSAGE;
  if (!isDecimal(quantity)) return 'Escribe una cantidad válida';
  const amount = Number(quantity);
  if (amount <= 0) return 'La cantidad debe ser mayor que cero';
  if (!decimalPattern(QUANTITY_DECIMALS).test(quantity)) {
    return `Usa máximo ${QUANTITY_DECIMALS} decimales`;
  }
  return amount > MAX_QUANTITY ? 'La cantidad es demasiado grande' : null;
}

// Una realización no se corrige después, así que se valida antes de guardar todo lo que el
// servidor va a comprobar. `today` es la fecha de Bogotá. La fecha puede ser anterior a la
// programada (la labor se adelantó), pero no al día en que la actividad se programó.
export const createCompletionSchema = ({
  today,
  activity,
}: {
  today: string;
  activity: Pick<AgriculturalActivity, 'activity_type' | 'created_at'>;
}) =>
  z
    .object({
      done_date: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
      inputs: z.array(
        z.object({
          input_id: z.string(),
          quantity: z.string().transform(normalizeQuantity),
        }),
      ),
    })
    .superRefine(({ done_date, inputs }, context) => {
      const issue = (path: (string | number)[], message: string) =>
        context.addIssue({ code: 'custom', path, message });

      if (done_date) {
        const plannedOn = dateInBogota(activity.created_at);
        if (!isIsoDate(done_date)) {
          issue(['done_date'], 'Escribe una fecha válida.');
        } else if (done_date > today) {
          issue(['done_date'], FUTURE_DATE_MESSAGE);
        } else if (done_date < plannedOn) {
          issue(
            ['done_date'],
            `La fecha no puede ser anterior a la programación de la actividad (${formatLongDate(plannedOn)})`,
          );
        }
      }

      // El inventario es el recordatorio de contar la bodega: el conteo se registra en Insumos, y
      // descontar aquí lo contaría dos veces.
      if (activity.activity_type === 'inventory' && inputs.length > 0) {
        issue(['inputs'], 'Una actividad de inventario no lleva insumos');
        return;
      }
      const seen = new Set<string>();
      inputs.forEach(({ input_id, quantity }, index) => {
        if (!input_id) {
          issue(['inputs', index, 'input_id'], 'Elige un insumo del catálogo');
        } else if (seen.has(input_id)) {
          issue(['inputs', index, 'input_id'], REPEATED_INPUT_MESSAGE);
        }
        seen.add(input_id);
        const error = quantityError(quantity);
        if (error) issue(['inputs', index, 'quantity'], error);
      });
    });

export type CompletionFormValues = z.output<
  ReturnType<typeof createCompletionSchema>
>;

// El cuerpo de la realización. `capturedAt` es la hora del dispositivo al guardar: puede ser
// horas antes de que llegue al servidor.
export const toCompletionRequest = (
  values: CompletionFormValues,
  capturedAt: string,
): Schemas['CompletionRequest'] => ({
  done_date: values.done_date,
  inputs: values.inputs,
  captured_at: capturedAt,
});

// Lo que hace falta de un insumo para escribir una cantidad suya.
type QuantityInput = {
  name: string;
  unit: string;
  package_type: string | null;
  package_size: string | null;
};

// La cantidad que se está escribiendo, con su unidad y lo que equivale en empaques ("100 kg · 2
// bultos"). `null` mientras no sea un número mayor que cero.
export function usedQuantityText(
  quantity: string,
  input: QuantityInput,
): string | null {
  const value = normalizeQuantity(quantity);
  if (!isDecimal(value) || Number(value) <= 0) return null;
  return formatStock(value, input.unit, inputPackageOf(input));
}

// Las existencias de la finca según la copia del dispositivo. Son solo una referencia: no limitan
// la cantidad, porque la labor ya se hizo.
export const stockReferenceText = (
  stock: string | null,
  input: QuantityInput,
) =>
  stock === null
    ? 'Sin movimientos en esta finca'
    : `Hay ${formatStock(stock, input.unit, inputPackageOf(input))}`;

function usedInputPhrase(quantity: string, input: QuantityInput) {
  const value = normalizeQuantity(quantity);
  const [, packages] = formatStock(
    value,
    input.unit,
    inputPackageOf(input),
  ).split(' · ');
  const amount = `${formatQuantity(value, input.unit)} de ${input.name}`;
  return packages ? `${amount} (${packages})` : amount;
}

const joinList = (items: string[]) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;

// Lo que se va a registrar, dicho antes de confirmar: después no se puede modificar.
export function completionSummary(
  activity: Pick<
    AgriculturalActivity,
    'activity_type' | 'other_description' | 'plot'
  >,
  doneDate: string,
  inputs: readonly { input: QuantityInput; quantity: string }[],
) {
  const used =
    inputs.length === 0
      ? 'sin insumos'
      : `con ${joinList(
          inputs.map(({ input, quantity }) => usedInputPhrase(quantity, input)),
        )}, que se descuentan del inventario de la finca`;
  return `Vas a registrar la labor ${activityTitle(activity)} de ${activity.plot.code} como realizada el ${formatLongDate(doneDate)}, ${used}. Después no se podrá modificar.`;
}
