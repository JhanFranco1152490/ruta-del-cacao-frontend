'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { SearchSelect } from '@/components/search-select';
import { TextField } from '@/components/text-field';
import type { FarmOption } from '@/lib/farm-filter';
import { farmLabel } from '@/lib/format/place-label';

import type { Warehouse } from '../api';
import { useCreateWarehouse, useUpdateWarehouse } from '../mutations';
import {
  NO_CHANGES,
  toWarehouseRequest,
  toWarehouseUpdate,
  WAREHOUSE_NAME_MAX_LENGTH,
  WAREHOUSE_SAVED,
  WAREHOUSE_UPDATED,
  type WarehouseFormInput,
  warehouseFormOf,
  warehouseFormSchema,
} from '../warehouse-form';
import { warehouseFailureOf } from '../warehouse-errors';

// Registrar una bodega en una finca, o cambiarle el nombre a `warehouse` si llega. La finca se
// elige al registrar (fija si la cuenta tiene una sola) y no se cambia al editar.
export function WarehouseFormDialog({
  warehouse,
  farms,
  farmId,
  onClose,
  onSaved,
}: {
  warehouse?: Warehouse;
  // Las fincas activas que la cuenta alcanza: donde se puede registrar.
  farms: readonly FarmOption[];
  // La finca del filtro, con la que empieza el formulario.
  farmId: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const only = farms.length === 1 ? farms[0] : undefined;
  const form = useForm<WarehouseFormInput>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: warehouseFormOf(warehouse, farmId ?? only?.id ?? ''),
  });
  const { errors } = form.formState;
  const chosenFarm = useWatch({ control: form.control, name: 'farm_id' });
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse(warehouse?.id ?? '');
  const saving = create.isPending || update.isPending;
  const [summary, setSummary] = useState<string>();

  const onError = (error: unknown) => {
    const failure = warehouseFailureOf(error, 'warehouse');
    if (failure.kind === 'field') {
      form.setError(failure.field as keyof WarehouseFormInput, {
        type: 'server',
        message: failure.message,
      });
      return;
    }
    setSummary(failure.message);
  };

  const submit = (values: WarehouseFormInput) => {
    setSummary(undefined);
    if (!warehouse) {
      create.mutate(toWarehouseRequest(values), {
        onSuccess: () => onSaved(WAREHOUSE_SAVED),
        onError,
      });
      return;
    }
    const body = toWarehouseUpdate(values, warehouse);
    if (!body) return onSaved(NO_CHANGES);
    update.mutate(body, {
      onSuccess: () => onSaved(WAREHOUSE_UPDATED),
      onError,
    });
  };

  const fixedFarm = warehouse ? farmLabel(warehouse.farm) : only?.label;
  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description={
        warehouse
          ? 'El nombre nuevo se ve también en los lotes que ya ingresaron a ella.'
          : 'Quedará activa para recibir lotes clasificados de su finca.'
      }
      error={summary}
      isSaving={saving}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      submitLabel={warehouse ? 'Guardar cambios' : 'Guardar'}
      title={warehouse ? `Editar ${warehouse.name}` : 'Nueva bodega'}
    >
      {fixedFarm ? (
        <div>
          <p className="font-bold text-selva">Finca</p>
          <p>{fixedFarm}</p>
        </div>
      ) : (
        <SearchSelect
          disabled={saving}
          error={errors.farm_id?.message}
          label="Finca"
          onChange={(option) =>
            form.setValue('farm_id', option?.id ?? '', {
              shouldValidate: form.formState.isSubmitted,
            })
          }
          options={farms}
          placeholder="Elige una finca"
          value={farms.find((farm) => farm.id === chosenFarm) ?? null}
        />
      )}
      <TextField
        disabled={saving}
        error={errors.name?.message}
        hint="Como la llaman en la finca. Único en la finca."
        label="Nombre"
        maxLength={WAREHOUSE_NAME_MAX_LENGTH}
        placeholder="Ej.: Bodega principal"
        {...form.register('name')}
      />
    </FormDialog>
  );
}
