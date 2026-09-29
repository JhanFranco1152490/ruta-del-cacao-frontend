'use client';
import { Controller } from 'react-hook-form';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/api/roles';
import type { AccountCreated } from '../api';
import { useCreateAccountForm } from '../use-create-account-form';
import { AccountFields } from './account-fields';
import { RoleCheckboxes } from './role-checkboxes';

export function AccountForm({
  roles,
  administrator,
  producer,
  onCreated,
  onBusy,
  onCancel,
}: {
  roles: Role[];
  administrator: boolean;
  producer?: string;
  onCreated: (account: AccountCreated) => void;
  onBusy: (value: boolean) => void;
  onCancel: () => void;
}) {
  const { form, submit, failure } = useCreateAccountForm({
    producer,
    administratorRole: administrator ? roles[0]?.id : undefined,
    allowedRoleIds: roles.map((role) => role.id),
    onCreated,
    onBusy,
  });
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
    >
      <fieldset disabled={isSubmitting} className="space-y-4">
        <AccountFields form={form} />
        {administrator ? (
          <>
            <p>Rol asignado: Administrador</p>
            {errors.role_ids && (
              <p role="alert" className="text-sm text-err">
                {errors.role_ids.message}
              </p>
            )}
          </>
        ) : (
          <Controller
            name="role_ids"
            control={control}
            render={({ field }) => (
              <RoleCheckboxes
                legend="Roles del empleado"
                roles={roles}
                value={field.value}
                onChange={field.onChange}
                error={errors.role_ids?.message}
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
      <SubmitButton pending={isSubmitting} pendingLabel="Creando…">
        Crear cuenta
      </SubmitButton>
      <Button
        type="button"
        variant="outline"
        disabled={isSubmitting}
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </form>
  );
}
