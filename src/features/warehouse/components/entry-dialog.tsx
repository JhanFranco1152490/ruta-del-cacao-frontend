'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { todayInBogota } from '@/lib/format/dates';

import type { LotStock } from '../api';
import {
  createEntryFormSchema,
  ENTRY_SAVED,
  ENTRY_UPDATED,
  type EntryFormInput,
  entryFormOf,
  toEntryCorrection,
  toEntryRequest,
} from '../entry-form';
import { kilosText } from '@/lib/stock-quantity';
import { useCorrectEntry, useRegisterEntry } from '../mutations';
import { useEntryWarehouses } from '../use-entry-warehouses';
import { NO_CHANGES } from '../warehouse-form';
import { warehouseFailureOf } from '../warehouse-errors';
import { EntryLocationField } from './entry-location-field';
import { NoActiveWarehouses } from './no-active-warehouses';

// «G1 250,0 kg · G2 55,2 kg clasificados»: la referencia de lo que entra, que no se escribe.
export const classifiedLine = (stock: LotStock) =>
  `G1 ${kilosText(stock.classified.g1_kg)} kg · G2 ${kilosText(stock.classified.g2_kg)} kg clasificados`;

// Ingresar un lote Clasificado a una bodega activa de su finca, o corregir la fecha, la bodega y la
// ubicación de su ingreso. Los kilos son los de la clasificación y no se escriben.
export function EntryDialog({
  stock,
  correcting,
  canManage,
  onClose,
  onSaved,
  onStatusChanged,
  onStale,
}: {
  stock: LotStock;
  correcting: boolean;
  // Para llevar a registrar una bodega si la finca no tiene ninguna activa.
  canManage: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStatusChanged: (message: string) => void;
  onStale: (message: string) => void;
}) {
  const today = todayInBogota();
  const entry = correcting ? stock.entry : null;
  const warehouses = useEntryWarehouses(stock.farm.id, entry);
  const schema = useMemo(
    () =>
      createEntryFormSchema({
        today,
        classifiedAt: stock.classified.classified_at,
      }),
    [today, stock.classified.classified_at],
  );
  const form = useForm<EntryFormInput>({
    resolver: zodResolver(schema),
    defaultValues: entryFormOf({ entry, today, onlyWarehouseId: null }),
  });
  const { errors } = form.formState;
  const warehouseId = useWatch({ control: form.control, name: 'warehouse_id' });

  // Con una sola bodega activa, queda elegida apenas se conoce.
  const { onlyId } = warehouses;
  useEffect(() => {
    if (onlyId && !form.getValues('warehouse_id')) {
      form.setValue('warehouse_id', onlyId);
    }
  }, [onlyId, form]);

  const register = useRegisterEntry(stock.lot.id);
  const correct = useCorrectEntry(stock.lot.id);
  const saving = register.isPending || correct.isPending;
  const [summary, setSummary] = useState<string>();

  const onError = (error: unknown) => {
    const failure = warehouseFailureOf(error, 'entry');
    if (failure.kind === 'status') return onStatusChanged(failure.message);
    if (failure.kind === 'stale') return onStale(failure.message);
    if (failure.kind === 'field') {
      form.setError(failure.field as keyof EntryFormInput, {
        type: 'server',
        message: failure.message,
      });
      return;
    }
    setSummary(failure.message);
  };

  const submit = (values: EntryFormInput) => {
    setSummary(undefined);
    if (!entry) {
      register.mutate(toEntryRequest(values, stock), {
        onSuccess: () => onSaved(ENTRY_SAVED),
        onError,
      });
      return;
    }
    const body = toEntryCorrection(values, entry);
    if (!body) return onSaved(NO_CHANGES);
    correct.mutate(body, {
      onSuccess: () => onSaved(ENTRY_UPDATED),
      onError,
    });
  };

  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={classifiedLine(stock)}
      error={summary}
      isSaving={saving}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      submitDisabled={warehouses.none}
      submitLabel={entry ? 'Guardar cambios' : 'Ingresar a bodega'}
      title={`${entry ? 'Corregir ingreso' : 'Ingresar a bodega'} · ${stock.lot.code}`}
    >
      {warehouses.none && (
        <NoActiveWarehouses
          canManage={canManage}
          farmId={stock.farm.id}
          onLeave={onClose}
        />
      )}
      <TextField
        disabled={saving}
        error={errors.entry_date?.message}
        label="Fecha de ingreso"
        max={today}
        type="date"
        {...form.register('entry_date')}
      />
      <SelectField
        disabled={saving || warehouses.none}
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
        disabled={saving}
        error={errors.location?.message}
        warehouseId={warehouseId || null}
        {...form.register('location')}
      />
    </FormDialog>
  );
}
