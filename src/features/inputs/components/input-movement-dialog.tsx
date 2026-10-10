'use client';

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

import { type AgriculturalInput, useInputStocks } from '../api';
import { NOTE_MAX_LENGTH } from '../movement-schemas';
import { inputPackageOf } from '../stock-format';
import type { FarmChoice } from './input-farm-select';
import { MovementAmountField } from './movement-amount-field';
import { MovementCountSummary } from './movement-count-summary';
import {
  MOVEMENT_TEXT,
  type MovementKind,
  useMovementForm,
} from './use-movement-form';

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
  input: AgriculturalInput;
  farms: readonly FarmChoice[];
  // La finca elegida en la lista; se puede cambiar aquí.
  farm: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const text = MOVEMENT_TEXT[kind];
  const { data: user } = useSession();
  const movement = useMovementForm({ kind, input, farms, farm, onSaved });
  const { form, farmId, isSaving } = movement;
  const { errors } = form.formState;
  const stocks = useInputStocks(user?.id, farmId);
  const inputPackage = inputPackageOf(input);

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
        <form className="space-y-4" noValidate onSubmit={movement.onSubmit}>
          <DialogHeader>
            <DialogTitle>
              {text.title}: {input.name}
            </DialogTitle>
            <DialogDescription>{text.description}</DialogDescription>
          </DialogHeader>
          {movement.general && (
            <p className="text-sm font-bold text-err" role="alert">
              {movement.general}
            </p>
          )}
          <SelectField
            disabled={isSaving}
            error={movement.farmError}
            label="Finca"
            onChange={(event) =>
              movement.chooseFarm(event.target.value || null)
            }
            value={farmId ?? ''}
          >
            <option value="">Elige una finca</option>
            {movement.activeFarms.map((choice) => (
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
