'use client';
import { Controller, useWatch } from 'react-hook-form';
import { SidePanelActions, SidePanelSection } from '@/components/side-panel';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { scopeOfRoles } from '@/lib/farm-scope';
import type { Role } from '@/lib/api/roles';
import type { AccountCreated } from '../api';
import { rolesById } from '../schemas';
import { useCreateAccountForm } from '../use-create-account-form';
import { useRoleCustomization } from '../use-role-customization';
import { CustomizeRoleDialog } from './customize-role-dialog';
import { AccountScopeField } from './account-scope-field';
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
  // Lo que piden los roles elegidos; sin `farmsOf` la cuenta no lleva fincas.
  const scopeOf = (roleIds: string[]) =>
    farmsOf ? scopeOfRoles(rolesById(roleIds, offered)) : null;
  const { form, submit, failure } = useCreateAccountForm({
    producer,
    administratorRole: administrator ? roles[0]?.id : undefined,
    allowedRoleIds: offered.map((role) => role.id),
    scopeOf,
    onCreated,
    onBusy,
  });
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  const roleIds = useWatch({ control, name: 'role_ids' });
  const farmIds = useWatch({ control, name: 'farm_ids' });
  const allFarms = useWatch({ control, name: 'all_farms' });
  return (
    <>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          void handleSubmit(submit)(event);
        }}
      >
        <fieldset disabled={isSubmitting} className="space-y-4">
          <SidePanelSection title="Datos">
            <div className="space-y-4">
              <AccountFields form={form} />
            </div>
          </SidePanelSection>
          {administrator ? (
            <SidePanelSection title="Rol">
              <p>Rol asignado: Administrador</p>
              {errors.role_ids && (
                <p role="alert" className="text-sm text-err">
                  {errors.role_ids.message}
                </p>
              )}
            </SidePanelSection>
          ) : (
            <Controller
              name="role_ids"
              control={control}
              render={({ field }) => (
                <SidePanelSection title="Roles">
                  <RoleCheckboxes
                    legend="Roles del empleado"
                    roles={offered}
                    {...customization.checkboxHandlers}
                    value={field.value}
                    onChange={field.onChange}
                    error={errors.role_ids?.message}
                    disabled={isSubmitting}
                  />
                </SidePanelSection>
              )}
            />
          )}
          {farmsOf && (
            <AccountScopeField
              userId={farmsOf.userId}
              producer={farmsOf.producer}
              required={scopeOfRoles(rolesById(roleIds, offered))}
              value={{ all_farms: allFarms, farm_ids: farmIds }}
              onChange={(scope) => {
                form.setValue('all_farms', scope.all_farms);
                form.setValue('farm_ids', scope.farm_ids, {
                  shouldValidate: true,
                });
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
        <SidePanelActions>
          <SubmitButton pending={isSubmitting} pendingLabel="Creando…">
            Crear cuenta
          </SubmitButton>
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-md text-base"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        </SidePanelActions>
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
