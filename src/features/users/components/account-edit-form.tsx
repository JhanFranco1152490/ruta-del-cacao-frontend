'use client';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Account } from '../api';
import { useEditAccountForm } from '../use-edit-account-form';
import { AccountFields } from './account-fields';

export function AccountEditForm({
  account,
  onDone,
  onBusy,
}: {
  account: Account;
  onDone: () => void;
  onBusy: (value: boolean) => void;
}) {
  const { form, submit, failure, identityLocked } = useEditAccountForm({
    account,
    onSaved: onDone,
    onBusy,
  });
  const { isSubmitting } = form.formState;
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        void form.handleSubmit(submit)(event);
      }}
    >
      <fieldset disabled={isSubmitting} className="space-y-4">
        <AccountFields form={form} identityLocked={identityLocked} />
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
