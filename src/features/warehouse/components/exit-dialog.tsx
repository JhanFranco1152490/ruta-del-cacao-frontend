'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { FormDialog } from '@/components/form-dialog';
import { SelectField } from '@/components/select-field';
import { TextAreaField } from '@/components/text-area-field';
import { TextField } from '@/components/text-field';
import { todayInBogota } from '@/lib/format/dates';
import { fromTenths, toTenths } from '@/lib/format/tenths';

import type { Grade, LotStock } from '../api';
import {
  createExitFormSchema,
  EXIT_SAVED,
  type ExitFormInput,
  exitFormOf,
  toExitRequest,
} from '../exit-form';
import {
  availableText,
  exceedsAvailableMessage,
  exitableGrades,
} from '../exit-quantity';
import {
  DETAIL_MAX_LENGTH,
  EXIT_REASON_OPTIONS,
  needsDetail,
} from '../exit-reasons';
import { useRegisterExit } from '../mutations';
import { warehouseFailureOf } from '../warehouse-errors';

// Registrar una salida de un calibre de un lote En bodega: merma, muestra, reproceso, traslado u
// otra. La cantidad se compara con lo disponible mientras se escribe y no deja guardar si lo pasa.
// Si otra persona sacó antes, el servidor dice cuánto queda y el formulario lo adopta.
export function ExitDialog({
  stock,
  proposedGrade,
  onClose,
  onSaved,
  onStatusChanged,
}: {
  stock: LotStock;
  proposedGrade?: Grade;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStatusChanged: (message: string) => void;
}) {
  const today = todayInBogota();
  // Lo que el servidor dijo que queda de un calibre al rechazar una salida: pesa más que lo leído.
  const [serverAvailable, setServerAvailable] = useState<{
    grade: Grade;
    tenths: number;
  }>();
  const grades = useMemo(
    () =>
      exitableGrades(stock.balances).map((option) =>
        option.grade === serverAvailable?.grade
          ? { ...option, availableTenths: serverAvailable.tenths }
          : option,
      ),
    [stock.balances, serverAvailable],
  );
  const schema = useMemo(
    () =>
      createExitFormSchema({
        today,
        enteredOn: stock.entry?.entry_date ?? today,
        grades,
      }),
    [today, stock.entry?.entry_date, grades],
  );
  const form = useForm<ExitFormInput>({
    resolver: zodResolver(schema),
    defaultValues: exitFormOf({ today, grades, proposed: proposedGrade }),
  });
  const { errors } = form.formState;
  const [grade, quantity, reason] = useWatch({
    control: form.control,
    name: ['grade', 'quantity_kg', 'reason'],
  });
  const chosen = grades.find((option) => option.grade === grade);
  // El único error que se dice mientras se escribe: pasar de lo disponible.
  const typed = toTenths(quantity);
  const exceeds =
    chosen !== undefined && typed !== null && typed > chosen.availableTenths;

  const register = useRegisterExit(stock.lot.id);
  const [summary, setSummary] = useState<string>();

  const onError = (error: unknown) => {
    const failure = warehouseFailureOf(error, 'exit');
    if (failure.kind === 'status') return onStatusChanged(failure.message);
    if (failure.kind === 'field') {
      if (failure.availableKg !== undefined && grade) {
        setServerAvailable({
          grade,
          tenths: toTenths(failure.availableKg) ?? 0,
        });
      }
      form.setError(failure.field as keyof ExitFormInput, {
        type: 'server',
        message: failure.message,
      });
      return;
    }
    setSummary(failure.message);
  };

  const submit = (values: ExitFormInput) => {
    setSummary(undefined);
    register.mutate(toExitRequest(values), {
      onSuccess: () => onSaved(EXIT_SAVED),
      onError,
    });
  };

  const quantityError =
    errors.quantity_kg?.message ??
    (exceeds
      ? exceedsAvailableMessage(fromTenths(chosen.availableTenths))
      : undefined);
  return (
    <FormDialog
      contentClassName="max-sm:h-dvh max-sm:max-w-none max-sm:rounded-none sm:max-w-lg"
      description="Para lo que sale sin venderse. Las ventas descuentan solas."
      error={summary}
      isSaving={register.isPending}
      onClose={onClose}
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      submitDisabled={exceeds}
      submitLabel="Registrar salida"
      title={`Registrar salida · ${stock.lot.code}`}
    >
      <SelectField
        disabled={register.isPending}
        error={errors.grade?.message}
        hint={chosen ? availableText(chosen.availableTenths) : undefined}
        label="Calibre"
        {...form.register('grade')}
      >
        <option disabled value="">
          Elige un calibre
        </option>
        {grades.map((option) => (
          <option key={option.grade} value={option.grade}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <TextField
        disabled={register.isPending}
        error={quantityError}
        inputMode="decimal"
        label="Cantidad (kg)"
        {...form.register('quantity_kg')}
      />
      <TextField
        disabled={register.isPending}
        error={errors.exit_date?.message}
        label="Fecha"
        max={today}
        type="date"
        {...form.register('exit_date')}
      />
      <SelectField
        disabled={register.isPending}
        error={errors.reason?.message}
        label="Motivo"
        {...form.register('reason')}
      >
        <option disabled value="">
          Elige un motivo
        </option>
        {EXIT_REASON_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <TextAreaField
        disabled={register.isPending}
        error={errors.detail?.message}
        label={needsDetail(reason) ? 'Detalle' : 'Detalle (opcional)'}
        maxLength={DETAIL_MAX_LENGTH}
        rows={3}
        {...form.register('detail')}
      />
    </FormDialog>
  );
}
