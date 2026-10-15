'use client';
import { Controller, useWatch } from 'react-hook-form';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/api/roles';
import type { AccountCreated } from '../api';
import { rolesNeedFarm } from '../schemas';
import { useCreateAccountForm } from '../use-create-account-form';
import { useRoleCustomization } from '../use-role-customization';
import { CustomizeRoleDialog } from './customize-role-dialog';
import { AccountFarmsField } from './account-farm-field';
import { AccountFields } from './account-fields';
import { RoleCheckboxes } from './role-checkboxes';

export function AccountForm({
  roles,
  administrator,
  producer,
  farmsOf,
  canCustomizeRoles = false,
  onCreated,
  onBusy,
  onCancel,
}: {
  roles: Role[];
  administrator: boolean;
  producer?: string;
  // De quién son las fincas que se ofrecen; ausente si esta cuenta no lleva finca.
  farmsOf?: { userId: string; producer?: string };
  // Si quien crea la cuenta puede crear roles: entonces ofrece "Personalizar permisos".
  canCustomizeRoles?: boolean;
  onCreated: (account: AccountCreated) => void;
  onBusy: (value: boolean) => void;
  onCancel: () => void;
}) {
  const customization = useRoleCustomization(
    roles,
    canCustomizeRoles && !administrator,
  );
  const offered = customization.roles;
  const needsFarm = (roleIds: string[]) =>
    Boolean(farmsOf) && rolesNeedFarm(roleIds, offered);
  const { form, submit, failure } = useCreateAccountForm({
    producer,
    administratorRole: administrator ? roles[0]?.id : undefined,
    allowedRoleIds: offered.map((role) => role.id),
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
    <>
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
                  roles={offered}
                  canCustomize={(option) => {
                    const role = offered.find(({ id }) => id === option.id);
                    return !!role && customization.canCustomize(role);
                  }}
                  onCustomize={(option) => {
                    const role = offered.find(({ id }) => id === option.id);
                    if (role) customization.start(role);
                  }}
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
      {customization.customizing && (
        <CustomizeRoleDialog
          base={customization.customizing}
          producer={producer}
          onClose={customization.close}
          onCreated={(role) =>
            form.setValue(
              'role_ids',
              customization.finish(role, form.getValues('role_ids')),
              { shouldValidate: true },
            )
          }
        />
      )}
    </>
  );
}
