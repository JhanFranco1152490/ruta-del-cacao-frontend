'use client';
import { Controller, useWatch } from 'react-hook-form';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/api/roles';
import type { AccountCreated } from '../api';
import { rolesNeedFarm } from '../schemas';
import { useCreateAccountForm } from '../use-create-account-form';
import { AccountFarmsField } from './account-farm-field';
import { AccountFields } from './account-fields';
import { RoleCheckboxes } from './role-checkboxes';

export function AccountForm({
  roles,
  administrator,
  producer,
  farmsOf,
  onCreated,
  onBusy,
  onCancel,
}: {
  roles: Role[];
  administrator: boolean;
  producer?: string;
  // De quién son las fincas que se ofrecen; ausente si esta cuenta no lleva finca.
  farmsOf?: { userId: string; producer?: string };
  onCreated: (account: AccountCreated) => void;
  onBusy: (value: boolean) => void;
  onCancel: () => void;
}) {
  const needsFarm = (roleIds: string[]) =>
    Boolean(farmsOf) && rolesNeedFarm(roleIds, roles);
  const { form, submit, failure } = useCreateAccountForm({
    producer,
    administratorRole: administrator ? roles[0]?.id : undefined,
    allowedRoleIds: roles.map((role) => role.id),
    needsFarm,
    onCreated,
    onBusy,
  });
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const roleIds = useWatch({ control, name: 'role_ids' });
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
        {farmsOf && (
          <Controller
            name="farm_ids"
            control={control}
            render={({ field }) => (
              <AccountFarmsField
                userId={farmsOf.userId}
                producer={farmsOf.producer}
                required={needsFarm(roleIds)}
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
