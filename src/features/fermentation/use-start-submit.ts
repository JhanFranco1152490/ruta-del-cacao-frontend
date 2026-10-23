'use client';

import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import {
  type Fermentation,
  useCorrectStart,
  useStartFermentation,
} from './api';
import { exceedsCapacity } from './capacity';
import { startFailureOf } from './start-errors';
import {
  capacityWarning,
  startChanges,
  type StartFormInput,
  type StartOptions,
  toStartRequest,
} from './start-form';

// Envía el inicio (o su corrección) y traduce cada rechazo. Si el lote pesa más que el cajón, antes
// de enviar se pide la confirmación; la API decide lo mismo por si la capacidad cambió entretanto.
export function useStartSubmit({
  lot,
  fermentation,
  options,
  form,
  reloadOptions,
  onSaved,
  onClose,
}: {
  lot: { id: string; greenWeightKg: string };
  fermentation?: Fermentation;
  options: StartOptions;
  form: UseFormReturn<StartFormInput>;
  reloadOptions: () => void;
  onSaved: () => void;
  onClose: () => void;
}) {
  const start = useStartFermentation();
  const correct = useCorrectStart(lot.id);
  const [warning, setWarning] = useState<string>();
  const [summary, setSummary] = useState<string>();
  const boxOf = (id: string) => options.facilities.find((box) => box.id === id);

  const fail = (error: unknown, values: StartFormInput) => {
    const box = boxOf(values.facility_id);
    const failure = startFailureOf(error, box?.name ?? 'El cajón');
    if (failure.kind === 'capacity') {
      setWarning(
        capacityWarning(failure.greenWeightKg ?? lot.greenWeightKg, {
          name: box?.name ?? 'el cajón',
          capacity_kg: failure.capacityKg ?? box?.capacity_kg ?? '0',
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
    const box = boxOf(values.facility_id);
    // Al corregir solo se compara si cambia el cajón: el lote ya estaba en el otro.
    const boxChanged =
      !fermentation || values.facility_id !== fermentation.facility.id;
    if (
      !confirmed &&
      boxChanged &&
      box &&
      exceedsCapacity(lot.greenWeightKg, box.capacity_kg)
    ) {
      setWarning(capacityWarning(lot.greenWeightKg, box));
      return;
    }
    setWarning(undefined);
    const handlers = {
      onSuccess: () => onSaved(),
      onError: (error: unknown) => fail(error, values),
    };
    if (!fermentation) {
      start.mutate(toStartRequest(values, lot.id, confirmed), handlers);
      return;
    }
    const changes = startChanges(values, fermentation);
    if (Object.keys(changes).length === 0) {
      onClose();
      return;
    }
    correct.mutate(
      {
        ...changes,
        expected_version: fermentation.version,
        ...(confirmed && { confirm_over_capacity: true }),
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
