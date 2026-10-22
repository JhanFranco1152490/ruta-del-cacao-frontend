'use client';

import { SearchSelect } from '@/components/search-select';
import { FormDialog } from '@/components/form-dialog';
import { TextField } from '@/components/text-field';
import { useSession } from '@/hooks/use-session';
import { todayInBogota } from '@/lib/format/dates';

import { type MovementInput, useInputStocks } from '../api';
import { NOTE_MAX_LENGTH } from '../movement-schemas';
import { inputPackageOf } from '@/lib/format/input-quantity';
import type { FarmChoice } from '../input-options';
import { MovementAmountField } from './movement-amount-field';
import { MovementCountSummary } from './movement-count-summary';
import {
  MOVEMENT_TEXT,
  type MovementKind,
  useMovementForm,
} from '../use-movement-form';

// Una entrada o un conteo de un insumo en una finca. El formulario y su envío viven en
// `useMovementForm`; aquí solo se dibujan.
export function InputMovementDialog({
  kind,
  input,
  farms,
  farm,
  onClose,
  onSaved,
}: {
  kind: MovementKind;
  input: MovementInput;
  farms: readonly FarmChoice[];
  // La finca elegida en la lista; se puede cambiar aquí.
  farm: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const text = MOVEMENT_TEXT[kind];
  const { data: user } = useSession();
  const movement = useMovementForm({ kind, input, farms, farm, onSaved });
  const farmOptions = movement.activeFarms.map(({ id, name }) => ({
    id,
    label: name,
  }));
  const { form, farmId, isSaving } = movement;
  const { errors } = form.formState;
  const stocks = useInputStocks(user?.id, farmId);
  const inputPackage = inputPackageOf(input);

  const currentStock = stocks.data?.data.find(
    (stock) => stock.input_id === input.id,
  );

  return (
    <FormDialog
      description={text.description}
      error={movement.general}
      isSaving={isSaving}
      onClose={onClose}
      onSubmit={movement.onSubmit}
      submitLabel={text.title}
      title={`${text.title}: ${input.name}`}
    >
      <SearchSelect
        disabled={isSaving}
        error={movement.farmError}
        label="Finca"
        onChange={(option) => movement.chooseFarm(option?.id ?? null)}
        options={farmOptions}
        placeholder="Elige una finca"
        value={farmOptions.find(({ id }) => id === farmId) ?? null}
      />
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
    </FormDialog>
  );
}
