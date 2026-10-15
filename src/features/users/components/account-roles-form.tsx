'use client';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/api/roles';
import { useSetAccountRoles, type Account } from '../api';
import {
  effectiveScope,
  scopeBody,
  scopeProblem,
  type AccountScope,
  scopeOfRoles,
} from '@/lib/farm-scope';
import { roleIdsSchema, rolesById, scopeOfAccount } from '../schemas';
import { useAccountSubmit } from '@/hooks/use-account-submit';
import { notify } from '@/lib/notify';
import { AccountScopeField } from './account-scope-field';
import { RoleCheckboxes } from './role-checkboxes';
import { useRoleCustomization } from '../use-role-customization';
import { CustomizeRoleDialog } from './customize-role-dialog';

const rolesSchema = z.object({
  role_ids: roleIdsSchema,
  farm_ids: z.array(z.string()),
  all_farms: z.boolean(),
});
type RolesValues = z.infer<typeof rolesSchema>;

export function AccountRolesForm({
  account,
  roles,
  farmsOf,
  canCustomizeRoles = false,
  producer,
  onDone,
  onBusy,
}: {
  account: Account;
  roles: Role[];
  // De quién son las fincas que se ofrecen; ausente si quien edita no asigna la finca.
  farmsOf?: { userId: string; producer?: string };
  // Si quien edita puede crear roles: entonces ofrece "Personalizar permisos".
  canCustomizeRoles?: boolean;
  // Solo la cuenta técnica: el productor del rol que se personaliza.
  producer?: string;
  onDone: () => void;
  onBusy: (value: boolean) => void;
}) {
  const mutation = useSetAccountRoles(account.id);
  const customization = useRoleCustomization(roles, canCustomizeRoles);
  const offered = customization.roles;
  const assignable = new Set(offered.map((role) => role.id));
  const locked = account.roles.filter((role) => !assignable.has(role.id));
  const form = useForm<RolesValues>({
    resolver: zodResolver(rolesSchema),
    // El alcance parte de lo que la cuenta ya tiene: solo se muestra si los roles nuevos lo piden
    // distinto.
    defaultValues: {
      role_ids: account.roles.map((role) => role.id),
      ...scopeOfAccount(account),
    },
  });
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;
  const roleIds = useWatch({ control, name: 'role_ids' });
  const farmIds = useWatch({ control, name: 'farm_ids' });
  const allFarms = useWatch({ control, name: 'all_farms' });
  // El alcance que tiene la cuenta debe cumplir lo que piden los roles nuevos; si no, se pide en la
  // misma operación.
  const required = scopeOfRoles(rolesById(roleIds, offered));
  const asksScope =
    Boolean(farmsOf) &&
    scopeProblem(required, scopeOfAccount(account)) !== null;
  const { run, failure } = useAccountSubmit({
    setError: form.setError,
    fields: ['role_ids', 'farm_ids', 'all_farms'],
    messages: {
      forbidden: 'Ya no tienes permiso para cambiar los roles.',
      fallback: 'No fue posible guardar los roles. Inténtalo nuevamente.',
    },
    onBusy,
  });
  const submit = (values: RolesValues) => {
    const scope: AccountScope = values;
    const problem = asksScope && scopeProblem(required, scope);
    if (problem) {
      form.setError('farm_ids', { message: problem });
      return;
    }
    return run(async () => {
      await mutation.mutateAsync({
        role_ids: values.role_ids,
        ...(asksScope ? scopeBody(effectiveScope(required, scope)) : {}),
      });
      notify.success('Roles actualizados');
      onDone();
    });
  };
  return (
    <>
      <form
        className="space-y-5"
        onSubmit={(event) => {
          void form.handleSubmit(submit)(event);
        }}
      >
        <Controller
          name="role_ids"
          control={control}
          render={({ field }) => (
            <RoleCheckboxes
              legend="Roles de la cuenta"
              roles={offered}
              canCustomize={(option) => {
                const role = offered.find(({ id }) => id === option.id);
                return !!role && customization.canCustomize(role);
              }}
              onCustomize={(option) => {
                const role = offered.find(({ id }) => id === option.id);
                if (role) customization.start(role);
              }}

              locked={locked}
              value={field.value}
              onChange={field.onChange}
              error={errors.role_ids?.message}
              disabled={isSubmitting}
            />
          )}
        />
        {asksScope && farmsOf && (
          <AccountScopeField
            userId={farmsOf.userId}
            producer={farmsOf.producer}
            required={required}
            current={account.farms}
            currentAll={account.all_farms}
            value={{ all_farms: allFarms, farm_ids: farmIds }}
            onChange={(scope) => {
              form.setValue('all_farms', scope.all_farms);
              form.setValue('farm_ids', scope.farm_ids);
            }}
            disabled={isSubmitting}
            error={errors.farm_ids?.message}
          />
        )}
        {failure && (
          <p role="alert" className="text-err">
            {failure}
          </p>
        )}
        <SubmitButton pending={isSubmitting} pendingLabel="Guardando…">
          Guardar roles
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
