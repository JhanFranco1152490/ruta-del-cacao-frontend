'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { SelectField } from '@/components/select-field';

import type { LotStock } from '../api';
import { useMoveStock } from '../mutations';
import {
  MOVE_SAVED,
  type MoveFormInput,
  moveFormOf,
  moveFormSchema,
  toMoveRequest,
} from '../move-form';
import { useEntryWarehouses } from '../use-entry-warehouses';
import { NO_CHANGES } from '../warehouse-form';
import { warehouseFailureOf } from '../warehouse-errors';
import { EntryLocationField } from './entry-location-field';

// Cambiar de bodega o de ubicación el cacao de un lote En bodega. A diferencia de corregir el
// ingreso, se puede en cualquier momento: es un movimiento real, que queda en el historial.
export function MoveDialog({
  stock,
  onClose,
  onSaved,
  onStatusChanged,
  onStale,
}: {
  stock: LotStock;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStatusChanged: (message: string) => void;
  onStale: (message: string) => void;
}) {
  // `requestOutcome` ya comprobó que el lote está En bodega, con su ingreso.
  const entry = stock.entry!;
  const warehouses = useEntryWarehouses(stock.farm.id, null);
  const form = useForm<MoveFormInput>({
    resolver: zodResolver(moveFormSchema),
    defaultValues: moveFormOf(entry),
  });
  const { errors } = form.formState;
  const warehouseId = useWatch({ control: form.control, name: 'warehouse_id' });
  const move = useMoveStock(stock.lot.id);
  const [summary, setSummary] = useState<string>();

  const onError = (error: unknown) => {
    const failure = warehouseFailureOf(error, 'move');
    if (failure.kind === 'status') return onStatusChanged(failure.message);
    if (failure.kind === 'stale') return onStale(failure.message);
    if (failure.kind === 'field') {
      form.setError(failure.field as keyof MoveFormInput, {
        type: 'server',
        message: failure.message,
      });
      return;
    }
    setSummary(failure.message);
  };

  const submit = (values: MoveFormInput) => {
    setSummary(undefined);
    const body = toMoveRequest(values, entry);
    if (!body) return onSaved(NO_CHANGES);
    move.mutate(body, { onSuccess: () => onSaved(MOVE_SAVED), onError });
  };

  const now = [entry.warehouse.name, entry.location]
    .filter(Boolean)
    .join(' · ');
  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={`Ahora está en ${now}.`}
      error={summary}
      isSaving={move.isPending}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      submitLabel="Mover"
      title={`Mover · ${stock.lot.code}`}
    >
      <SelectField
        disabled={move.isPending}
        error={errors.warehouse_id?.message}
        label="Bodega"
        {...form.register('warehouse_id')}
      >
        <option disabled value="">
          Elige una bodega
        </option>
        {warehouses.options.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.name}
          </option>
        ))}
      </SelectField>
      <EntryLocationField
        disabled={move.isPending}
        error={errors.location?.message}
        warehouseId={warehouseId || null}
        {...form.register('location')}
      />
    </FormDialog>
  );
}
