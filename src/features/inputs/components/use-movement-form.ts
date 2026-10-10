'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type FormEvent, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { todayInBogota } from '@/lib/format/dates';

import { type AgriculturalInput, useCreateInputMovement } from '../api';
import { movementErrorOf, type MovementField } from '../movement-errors';
import {
  buildMovementRequest,
  type CountValues,
  createCountSchema,
  createEntrySchema,
  type EntryValues,
  type MovementFormInput,
} from '../movement-schemas';
import { REQUIRED_FIELD_MESSAGE } from '../schemas';
import { inputPackageOf } from '../stock-format';
import type { FarmChoice } from './input-farm-select';

export type MovementKind = 'entry' | 'count';

export const ENTRY_SAVED_MESSAGE = 'Entrada registrada';
export const COUNT_SAVED_MESSAGE = 'Conteo registrado';

export const MOVEMENT_TEXT = {
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

// El formulario de una entrada o un conteo y su envío. El `id` se fija al abrir: un doble clic o un
// reintento tras perder la respuesta llegan con el mismo y el servidor no registra dos veces. Ante
// un error, cada mensaje va a su campo y lo escrito se conserva.
export function useMovementForm({
  kind,
  input,
  farms,
  farm,
  onSaved,
}: {
  kind: MovementKind;
  input: AgriculturalInput;
  farms: readonly FarmChoice[];
  farm: string | null;
  onSaved: (message: string) => void;
}) {
  const create = useCreateInputMovement();
  const [id] = useState(() => crypto.randomUUID());
  // Una finca inactiva no recibe entradas ni conteos: no se ofrece.
  const activeFarms = farms.filter((choice) => choice.is_active);
  const [farmId, setFarmId] = useState(
    activeFarms.some((choice) => choice.id === farm) ? farm : null,
  );
  const [farmError, setFarmError] = useState<string>();
  const [general, setGeneral] = useState<string>();
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
      amount_in: inputPackageOf(input) ? 'packages' : 'unit',
      note: '',
    },
  });

  const showError = (error: unknown) => {
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
  };

  const submit = async (values: EntryValues | CountValues) => {
    if (!farmId) return;
    setGeneral(undefined);
    setFarmError(undefined);
    try {
      await create.mutateAsync(
        buildMovementRequest({ id, inputId: input.id, farmId }, kind, values),
      );
      onSaved(MOVEMENT_TEXT[kind].saved);
    } catch (error) {
      showError(error);
    }
  };

  return {
    form,
    activeFarms,
    farmId,
    chooseFarm: (next: string | null) => {
      setFarmId(next);
      setFarmError(undefined);
    },
    farmError,
    general,
    isSaving: create.isPending,
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      if (!farmId) setFarmError(REQUIRED_FIELD_MESSAGE);
      void form.handleSubmit(submit)(event);
    },
  };
}
