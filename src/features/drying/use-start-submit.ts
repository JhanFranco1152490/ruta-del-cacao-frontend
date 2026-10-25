'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import {
  type Drying,
  type StartOptions,
  useCorrectStart,
  useStartDrying,
} from './api';
import { entryMoistureWarning, isOutsideRange } from './moisture';
import { startFailureOf } from './start-errors';
import {
  startChanges,
  type StartFormInput,
  toStartRequest,
} from './start-form';

// Envía el inicio (o su corrección) y traduce cada rechazo. Si la humedad de entrada cae fuera del
// rango, antes de enviar se pide la confirmación; la API decide lo mismo por si el rango cambió
// entretanto.
export function useStartSubmit({
  lot,
  drying,
  options,
  form,
  reloadOptions,
  onSaved,
  onClose,
}: {
  lot: { id: string };
  drying?: Drying;
  options: StartOptions;
  form: UseFormReturn<StartFormInput>;
  reloadOptions: () => void;
  onSaved: () => void;
  onClose: () => void;
}) {
  const start = useStartDrying();
  const correct = useCorrectStart(lot.id);
  const [warning, setWarning] = useState<string>();
  const [summary, setSummary] = useState<string>();
  const dryerOf = (id: string) =>
    options.facilities.find((dryer) => dryer.id === id);

  const fail = (error: unknown, values: StartFormInput) => {
    const failure = startFailureOf(
      error,
      dryerOf(values.facility_id)?.name ?? 'La marquesina',
    );
    if (failure.kind === 'moisture') {
      setWarning(
        entryMoistureWarning(values.entry_moisture_pct, {
          min: failure.min ?? options.entry_moisture_range.min,
          max: failure.max ?? options.entry_moisture_range.max,
        }),
      );
    } else if (failure.kind === 'field') {
      form.setError(failure.field, {
        type: 'server',
        message: failure.message,
      });
      if (failure.reload) reloadOptions();
    } else {
      setSummary(failure.message);
    }
  };

  const send = (values: StartFormInput, confirmed: boolean) => {
    setSummary(undefined);
    // Al corregir solo se compara si cambia la humedad: la anterior ya se había confirmado.
    const moistureChanged =
      !drying ||
      Number(values.entry_moisture_pct) !== Number(drying.entry_moisture_pct);
    if (
      !confirmed &&
      moistureChanged &&
      isOutsideRange(values.entry_moisture_pct, options.entry_moisture_range)
    ) {
      setWarning(
        entryMoistureWarning(
          values.entry_moisture_pct,
          options.entry_moisture_range,
        ),
      );
      return;
    }
    setWarning(undefined);
    const handlers = {
      onSuccess: () => onSaved(),
      onError: (error: unknown) => fail(error, values),
    };
    if (!drying) {
      start.mutate(toStartRequest(values, lot.id, confirmed), handlers);
      return;
    }
    const changes = startChanges(values, drying);
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    correct.mutate(
      {
        ...changes,
        expected_version: drying.version,
        ...(confirmed && { confirm_entry_moisture: true }),
      },
      handlers,
    );
  };

  return {
    send,
    warning,
    dismissWarning: () => setWarning(undefined),
    summary,
    isSaving: start.isPending || correct.isPending,
  };
}
