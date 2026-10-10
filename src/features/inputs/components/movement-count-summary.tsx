'use client';

import type { UseFormReturn } from 'react-hook-form';

import type { AgriculturalInput } from '../api';
import { amountInUnit, type MovementFormInput } from '../movement-schemas';
import {
  formatCountDifference,
  formatStock,
  inputPackageOf,
} from '../stock-format';

// Lo que el sistema tiene antes de contar y la diferencia que va a registrar lo contado. El
// servidor la vuelve a calcular al guardar, contra las existencias de ese momento.
export function MovementCountSummary<TValues>({
  form,
  input,
  quantity,
  isLoading,
}: {
  form: UseFormReturn<MovementFormInput, unknown, TValues>;
  input: AgriculturalInput;
  // Las existencias en la finca elegida; `null` si nunca tuvo movimientos en ella.
  quantity: string | null;
  isLoading: boolean;
}) {
  const inputPackage = inputPackageOf(input);
  const counted = amountInUnit(
    form.watch('amount'),
    form.watch('amount_in'),
    inputPackage,
  );

  if (isLoading) {
    return <p className="text-sm">Consultando las existencias…</p>;
  }
  return (
    <div className="space-y-1 rounded-md border border-border bg-muted p-3 text-sm">
      {quantity === null ? (
        <p className="font-bold">Sin movimientos en esta finca</p>
      ) : (
        <p>
          <span className="font-bold">El sistema tiene </span>
          {formatStock(quantity, input.unit, inputPackage)}
        </p>
      )}
      {counted !== null && (
        <p aria-live="polite" className="font-bold text-selva">
          {formatCountDifference(counted, quantity, input.unit)}
        </p>
      )}
    </div>
  );
}
