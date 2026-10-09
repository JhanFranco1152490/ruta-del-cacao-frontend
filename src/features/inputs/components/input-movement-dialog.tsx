'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { SelectField } from '@/components/select-field';
import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSession } from '@/hooks/use-session';
import { todayInBogota } from '@/lib/format/dates';

import {
  type AgriculturalInput,
  useCreateInputMovement,
  useInputStocks,
} from '../api';
import { movementErrorOf, type MovementField } from '../movement-errors';
import {
  buildMovementRequest,
  type CountValues,
  createCountSchema,
  createEntrySchema,
  type EntryValues,
  type MovementFormInput,
  NOTE_MAX_LENGTH,
} from '../movement-schemas';
import { REQUIRED_FIELD_MESSAGE } from '../schemas';
import { inputPackageOf } from '../stock-format';
import type { FarmChoice } from './input-farm-select';
import { MovementAmountField } from './movement-amount-field';
import { MovementCountSummary } from './movement-count-summary';

export type MovementKind = 'entry' | 'count';

export const ENTRY_SAVED_MESSAGE = 'Entrada registrada';
export const COUNT_SAVED_MESSAGE = 'Conteo registrado';

const TEXT = {
  entry: {
    title: 'Registrar entrada',
    description: 'Una compra, una donación o lo que ya había al empezar.',
    amount: 'Cantidad',
    notePlaceholder: 'Por ejemplo, compra de octubre',
    saved: ENTRY_SAVED_MESSAGE,
  },
  count: {
    title: 'Registrar conteo',
    description:
      'Lo que hay en la bodega: las existencias quedan en lo contado y se registra la diferencia.',
    amount: 'Cantidad contada',
    notePlaceholder: 'Por ejemplo, se derramó medio pote',
    saved: COUNT_SAVED_MESSAGE,
  },
} as const;

// Una entrada o un conteo de un insumo en una finca. El `id` se fija al abrir: un doble clic o un
// reintento tras perder la respuesta llegan con el mismo y el servidor no registra dos veces.
export function InputMovementDialog({
  kind,
  input,
  farms,
  farm,
  onClose,
  onSaved,
}: {
  kind: MovementKind;
  input: AgriculturalInput;
  farms: readonly FarmChoice[];
  // La finca elegida en la lista; se puede cambiar aquí.
  farm: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const text = TEXT[kind];
  const { data: user } = useSession();
  const create = useCreateInputMovement();
  const [id] = useState(() => crypto.randomUUID());
  const activeFarms = farms.filter((choice) => choice.is_active);
  const [farmId, setFarmId] = useState(
    activeFarms.some((choice) => choice.id === farm) ? farm : null,
  );
  const [farmError, setFarmError] = useState<string>();
  const [general, setGeneral] = useState<string>();
  const stocks = useInputStocks(user?.id, farmId);
  const inputPackage = inputPackageOf(input);
  const schema = useMemo(
    () =>
      kind === 'entry'
        ? createEntrySchema(inputPackageOf(input))
        : createCountSchema(inputPackageOf(input)),
    [kind, input],
  );
  const form = useForm<MovementFormInput, unknown, EntryValues | CountValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      occurred_on: todayInBogota(),
      amount: '',
      amount_in: inputPackage ? 'packages' : 'unit',
      note: '',
    },
  });
  const { errors } = form.formState;
  const isSaving = create.isPending;

  const submit = async (values: EntryValues | CountValues) => {
    if (!farmId) {
      setFarmError(REQUIRED_FIELD_MESSAGE);
      return;
    }
    setGeneral(undefined);
    setFarmError(undefined);
    try {
      await create.mutateAsync(
        buildMovementRequest({ id, inputId: input.id, farmId }, kind, values),
      );
      onSaved(text.saved);
    } catch (error) {
      const { fields, general: message } = movementErrorOf(error);
      for (const [field, fieldMessage] of Object.entries(fields)) {
        if (field === 'farm') setFarmError(fieldMessage);
        else {
          form.setError(field as Exclude<MovementField, 'farm'>, {
            type: 'server',
            message: fieldMessage,
          });
        }
      }
      setGeneral(message);
    }
  };

  const currentStock = stocks.data?.data.find(
    (stock) => stock.input_id === input.id,
  );

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!isSaving}>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            if (!farmId) setFarmError(REQUIRED_FIELD_MESSAGE);
            void form.handleSubmit(submit)(event);
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {text.title}: {input.name}
            </DialogTitle>
            <DialogDescription>{text.description}</DialogDescription>
          </DialogHeader>
          {general && (
            <p className="text-sm font-bold text-err" role="alert">
              {general}
            </p>
          )}
          <SelectField
            disabled={isSaving}
            error={farmError}
            label="Finca"
            onChange={(event) => {
              setFarmId(event.target.value || null);
              setFarmError(undefined);
            }}
            value={farmId ?? ''}
          >
            <option value="">Elige una finca</option>
            {activeFarms.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.name}
              </option>
            ))}
          </SelectField>
          {kind === 'count' && farmId && (
            <MovementCountSummary
              form={form}
              input={input}
              isLoading={stocks.isPending}
              quantity={currentStock?.quantity ?? null}
            />
          )}
          <TextField
            disabled={isSaving}
            error={errors.occurred_on?.message}
            label="Fecha"
            max={todayInBogota()}
            type="date"
            {...form.register('occurred_on')}
          />
          <MovementAmountField
            disabled={isSaving}
            error={errors.amount?.message}
            form={form}
            inputPackage={inputPackage}
            label={text.amount}
            unit={input.unit}
          />
          <TextField
            disabled={isSaving}
            error={errors.note?.message}
            label="Nota (opcional)"
            maxLength={NOTE_MAX_LENGTH}
            placeholder={text.notePlaceholder}
            {...form.register('note')}
          />
          <DialogFooter>
            <DialogClose
              disabled={isSaving}
              render={<Button variant="outline" />}
            >
              Cancelar
            </DialogClose>
            <SubmitButton
              className="sm:w-auto"
              pending={isSaving}
              pendingLabel="Guardando…"
            >
              {text.title}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
