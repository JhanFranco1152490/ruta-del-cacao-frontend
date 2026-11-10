'use client';

import { Trash2 } from 'lucide-react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { SearchSelect } from '@/components/search-select';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { formatPesos } from '@/lib/format/pesos';

import { lineSubtotal } from '../sale-amounts';
import {
  findStockOption,
  fullQuantityText,
  type StockOption,
} from '../sale-line-options';
import type { SaleFormInput } from '../sale-schema';

// Una línea de la venta: un lote y un calibre de la finca, sus kilos y su precio por kilo, y el
// subtotal que sale de ellos. En celular es una tarjeta con el lote arriba y los kilos y el precio en
// dos columnas.
export function SaleLineFields({
  index,
  offered,
  options,
  disabled,
  onRemove,
}: {
  index: number;
  // Lo que puede elegir esta línea: las existencias que no tomó otra.
  offered: readonly StockOption[];
  // Todas las existencias de la finca, para leer la elegida.
  options: readonly StockOption[];
  disabled: boolean;
  onRemove: () => void;
}) {
  const {
    control,
    register,
    setValue,
    formState: { errors, isSubmitted },
  } = useFormContext<SaleFormInput>();
  const line = useWatch({ control, name: `lines.${index}` });
  const lineErrors = errors.lines?.[index];
  const chosen = line ? findStockOption(options, line.stock) : undefined;
  const subtotal = line
    ? lineSubtotal(line.quantity_kg, line.price_per_kg)
    : null;
  const position = index + 1;

  return (
    <li
      aria-label={`Línea ${position}`}
      className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border p-4 sm:grid-cols-[minmax(0,1fr)_8rem_9rem_auto]"
    >
      <Controller
        control={control}
        name={`lines.${index}.stock`}
        render={({ field }) => (
          <SearchSelect
            className="col-span-2 sm:col-span-1"
            disabled={disabled}
            error={lineErrors?.stock?.message}
            label="Lote y calibre"
            onBlur={field.onBlur}
            onChange={(option) => {
              field.onChange(option?.id ?? '');
              // Elegir otro lote cambia lo disponible: los kilos vuelven a ser todos los que hay.
              const picked = option && findStockOption(options, option.id);
              if (picked) {
                setValue(
                  `lines.${index}.quantity_kg`,
                  fullQuantityText(picked),
                  { shouldValidate: isSubmitted },
                );
              }
            }}
            options={offered.map((option) => ({
              id: option.value,
              label: option.label,
              description: option.hint,
            }))}
            placeholder="Elige el lote"
            value={chosen ? { id: chosen.value, label: chosen.label } : null}
          />
        )}
      />
      <TextField
        disabled={disabled}
        error={lineErrors?.quantity_kg?.message}
        hint={chosen?.hint}
        inputMode="decimal"
        label="Kilos"
        {...register(`lines.${index}.quantity_kg`)}
      />
      <TextField
        disabled={disabled}
        error={lineErrors?.price_per_kg?.message}
        inputMode="numeric"
        label="Precio por kilo"
        placeholder="$"
        {...register(`lines.${index}.price_per_kg`)}
      />
      <div className="col-span-2 flex items-end justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:justify-start">
        <p className="text-sm">
          <span className="text-muted-foreground">Subtotal </span>
          <output
            aria-label={`Subtotal de la línea ${position}`}
            className="font-bold tabular-nums"
          >
            {subtotal === null ? '—' : formatPesos(subtotal)}
          </output>
        </p>
        <Button
          aria-label={`Quitar la línea ${position}`}
          disabled={disabled}
          onClick={onRemove}
          size="office"
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          <span className="sm:sr-only">Quitar línea</span>
        </Button>
      </div>
    </li>
  );
}
