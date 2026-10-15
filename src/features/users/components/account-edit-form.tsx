'use client';
import { Controller } from 'react-hook-form';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Account } from '../api';
import { useEditAccountForm } from '../use-edit-account-form';
import { AccountFarmsField } from './account-farm-field';
import { AccountFields } from './account-fields';

export function AccountEditForm({
  account,
  farmsOf,
  onDone,
  onBusy,
}: {
  account: Account;
  // De quién son las fincas que se ofrecen; ausente si quien edita no asigna la finca.
  farmsOf?: { userId: string; producer?: string };
  onDone: () => void;
  onBusy: (value: boolean) => void;
}) {
  const { form, submit, failure, identityLocked } = useEditAccountForm({
    account,
    withFarm: Boolean(farmsOf),
    onSaved: onDone,
    onBusy,
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        void form.handleSubmit(submit)(event);
      }}
    >
      <fieldset disabled={isSubmitting} className="space-y-4">
        <AccountFields form={form} identityLocked={identityLocked} />
        {farmsOf && (
          <Controller
            name="farm_ids"
            control={form.control}
            render={({ field }) => (
              <AccountFarmsField
                userId={farmsOf.userId}
                producer={farmsOf.producer}
                // Si sus roles las exigen lo sabe el servidor, que marca el campo al guardar.
                required={account.needs_farm || account.farms.length > 0}
                current={account.farms}
                value={field.value}
                onChange={field.onChange}
                error={errors.farm_ids?.message}
                disabled={isSubmitting}
              />
            )}
          />
        )}
      </fieldset>
      {failure && (
        <p role="alert" className="text-err">
          {failure}
        </p>
      )}
      <SubmitButton pending={isSubmitting} pendingLabel="Guardando…">
        Guardar cambios
      </SubmitButton>
      <Button
        type="button"
        variant="outline"
        disabled={isSubmitting}
        onClick={onDone}
      >
        Cancelar
      </Button>
    </form>
  );
}
