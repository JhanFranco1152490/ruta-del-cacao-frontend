'use client';

import type { UseFormReturn } from 'react-hook-form';

import { SegmentedControl } from '@/components/segmented-control';
import { TextField } from '@/components/text-field';

import {
  PACKAGE_TYPE_OPTIONS,
  UNIT_SYMBOLS,
  type InputUnit,
} from '../input-options';
import {
  type AmountIn,
  amountInUnit,
  type MovementFormInput,
} from '../movement-schemas';
import { formatQuantity, type InputPackage } from '../stock-format';

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

// La cantidad de una entrada o de un conteo. Con presentación se escribe en empaques o en la
// unidad, y debajo siempre se ve lo que suma en la unidad del insumo ("= 300 mL").
export function MovementAmountField<TValues>({
  form,
  label,
  unit,
  inputPackage,
  error,
  disabled,
}: {
  form: UseFormReturn<MovementFormInput, unknown, TValues>;
  label: string;
  unit: string;
  inputPackage: InputPackage | null;
  error?: string;
  disabled: boolean;
}) {
  const amount = form.watch('amount');
  const amountIn = form.watch('amount_in');
  const inUnit = amountInUnit(amount, amountIn, inputPackage);
  const packageName = PACKAGE_TYPE_OPTIONS.find(
    (option) => option.value === inputPackage?.package_type,
  )?.plural;
  const unitSymbol = UNIT_SYMBOLS[unit as InputUnit]?.plural ?? unit;
  const writtenIn =
    amountIn === 'packages' && packageName ? packageName : unitSymbol;

  return (
    <div className="space-y-2">
      {inputPackage && packageName && (
        <SegmentedControl<AmountIn>
          label="Escribir la cantidad en"
          onChange={(value) => form.setValue('amount_in', value)}
          options={[
            { value: 'packages', label: capitalize(packageName) },
            { value: 'unit', label: unitSymbol },
          ]}
          value={amountIn}
        />
      )}
      <TextField
        disabled={disabled}
        error={error}
        inputMode="decimal"
        label={`${label} (${writtenIn})`}
        {...form.register('amount')}
      />
      {inUnit !== null && (
        <p className="text-sm font-bold text-selva">
          = {formatQuantity(inUnit, unit)}
        </p>
      )}
    </div>
  );
}
