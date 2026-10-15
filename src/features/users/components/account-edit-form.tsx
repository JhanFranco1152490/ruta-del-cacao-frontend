'use client';
import { useWatch } from 'react-hook-form';
import { scopeOfRoles } from '@/lib/farm-scope';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Account } from '../api';
import { useEditAccountForm } from '../use-edit-account-form';
import { AccountScopeField } from './account-scope-field';
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
  const farmIds = useWatch({ control: form.control, name: 'farm_ids' });
  const allFarms = useWatch({ control: form.control, name: 'all_farms' });
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
          <AccountScopeField
            userId={farmsOf.userId}
            producer={farmsOf.producer}
            // Lo que piden sus roles; el servidor lo vuelve a comprobar al guardar.
            required={scopeOfRoles(account.roles)}
            current={account.farms}
            currentAll={account.all_farms}
            value={{ all_farms: allFarms, farm_ids: farmIds }}
            onChange={(scope) => {
              form.setValue('all_farms', scope.all_farms, {
                shouldDirty: true,
              });
              form.setValue('farm_ids', scope.farm_ids, { shouldDirty: true });
            }}
            error={errors.farm_ids?.message}
            disabled={isSubmitting}
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
