import { z } from 'zod';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { stockQuantityIssue } from '@/lib/stock-quantity';

import type { SaleCreateRequest } from './api';
import { saleDateIssue } from './sale-date';
import { MAX_SALE_LINES, NOTES_MAX_LENGTH } from './sale-limits';
import { findStockOption, type StockOption } from './sale-line-options';
import { parsePrice, priceIssue } from './sale-price';

export type SaleLineInput = {
  // La existencia elegida (`stockKey`), o vacío.
  stock: string;
  quantity_kg: string;
  price_per_kg: string;
};

export type SaleFormInput = {
  farm_id: string;
  buyer_id: string;
  sale_date: string;
  notes: string;
  lines: SaleLineInput[];
};

export const NO_LINES_MESSAGE = 'Agrega al menos un lote.';
export const TOO_MANY_LINES_MESSAGE = `Una venta lleva máximo ${MAX_SALE_LINES} lotes.`;
export const STOCK_GONE_MESSAGE =
  'Este lote ya no tiene ese calibre en bodega.';

export const emptySaleLine = (): SaleLineInput => ({
  stock: '',
  quantity_kg: '',
  price_per_kg: '',
});

// Hoy, la finca si viene elegida (o es la única) y una línea vacía para empezar.
export const emptySaleForm = ({
  today,
  farmId = '',
}: {
  today: string;
  farmId?: string;
}): SaleFormInput => ({
  farm_id: farmId,
  buyer_id: '',
  sale_date: today,
  notes: '',
  lines: [emptySaleLine()],
});

// Los kilos se comparan con lo disponible de la existencia elegida y la fecha con el ingreso de sus
// lotes: por eso el esquema se arma con las existencias de la finca.
export const createSaleFormSchema = (context: {
  today: string;
  options: readonly StockOption[];
}) =>
  z
    .object({
      farm_id: z.string(),
      buyer_id: z.string(),
      sale_date: z.string(),
      notes: z
        .string()
        .trim()
        .max(NOTES_MAX_LENGTH, `Máximo ${NOTES_MAX_LENGTH} caracteres.`),
      lines: z.array(
        z.object({
          stock: z.string(),
          quantity_kg: z.string(),
          price_per_kg: z.string(),
        }),
      ),
    })
    .superRefine((values, issues) => {
      const add = (path: (string | number)[], message: string) =>
        issues.addIssue({ code: 'custom', path, message });
      if (!values.farm_id) add(['farm_id'], REQUIRED_FIELD_MESSAGE);
      if (!values.buyer_id) add(['buyer_id'], REQUIRED_FIELD_MESSAGE);
      if (values.lines.length === 0) add(['lines'], NO_LINES_MESSAGE);
      if (values.lines.length > MAX_SALE_LINES) {
        add(['lines'], TOO_MANY_LINES_MESSAGE);
      }
      const chosen: StockOption[] = [];
      values.lines.forEach((line, index) => {
        const option = line.stock
          ? findStockOption(context.options, line.stock)
          : undefined;
        if (!line.stock) add(['lines', index, 'stock'], REQUIRED_FIELD_MESSAGE);
        else if (!option) add(['lines', index, 'stock'], STOCK_GONE_MESSAGE);
        else chosen.push(option);
        // Sin existencia elegida no hay contra qué comparar: basta con que los kilos estén bien.
        const quantity = stockQuantityIssue(
          line.quantity_kg,
          option?.availableTenths ?? Number.POSITIVE_INFINITY,
        );
        if (quantity) add(['lines', index, 'quantity_kg'], quantity);
        const price = priceIssue(line.price_per_kg);
        if (price) add(['lines', index, 'price_per_kg'], price);
      });
      const date = saleDateIssue(values.sale_date, {
        today: context.today,
        lots: chosen.map(({ lotCode, entryDate }) => ({
          code: lotCode,
          entryDate,
        })),
      });
      if (date) add(['sale_date'], date);
    });

// La API recibe el lote y el calibre por separado, los kilos con punto decimal y el precio entero.
// Solo se llama con el formulario ya validado.
export function toCreateRequest(
  values: SaleFormInput,
  options: readonly StockOption[],
): SaleCreateRequest {
  return {
    farm_id: values.farm_id,
    buyer_id: values.buyer_id,
    sale_date: values.sale_date,
    notes: values.notes.trim(),
    lines: values.lines.map((line) => {
      const option = findStockOption(options, line.stock)!;
      return {
        lot_id: option.lotId,
        grade: option.grade,
        quantity_kg: line.quantity_kg.trim().replace(',', '.'),
        price_per_kg: parsePrice(line.price_per_kg)!,
      };
    }),
  };
}
