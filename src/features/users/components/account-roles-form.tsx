'use client';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/api/roles';
import { useSetAccountRoles, type Account } from '../api';
import { FARM_REQUIRED, roleIdsSchema, rolesNeedFarm } from '../schemas';
import { useAccountSubmit } from '@/hooks/use-account-submit';
import { notify } from '@/lib/notify';
import { AccountFarmsField } from './account-farm-field';
import { RoleCheckboxes } from './role-checkboxes';

const rolesSchema = z.object({
  role_ids: roleIdsSchema,
  farm_ids: z.array(z.string()),
});
type RolesValues = z.infer<typeof rolesSchema>;

export function AccountRolesForm({
  account,
  roles,
  farmsOf,
  onDone,
  onBusy,
}: {
  account: Account;
  roles: Role[];
  // De quién son las fincas que se ofrecen; ausente si quien edita no asigna la finca.
  farmsOf?: { userId: string; producer?: string };
  onDone: () => void;
  onBusy: (value: boolean) => void;
}) {
  const mutation = useSetAccountRoles(account.id);
  const assignable = new Set(roles.map((role) => role.id));
  const locked = account.roles.filter((role) => !assignable.has(role.id));
  const form = useForm<RolesValues>({
    resolver: zodResolver(rolesSchema),
    defaultValues: {
      role_ids: account.roles.map((role) => role.id),
      farm_ids: [],
    },
  });
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;
  const roleIds = useWatch({ control, name: 'role_ids' });
  // Al ganar permisos de campo, una cuenta sin finca las recibe en la misma operación.
  const asksFarm =
    Boolean(farmsOf) && !account.farms.length && rolesNeedFarm(roleIds, roles);
  const { run, failure } = useAccountSubmit({
    setError: form.setError,
    fields: ['role_ids', 'farm_ids'],
    messages: {
      forbidden: 'Ya no tienes permiso para cambiar los roles.',
      fallback: 'No fue posible guardar los roles. Inténtalo nuevamente.',
    },
    onBusy,
  });
  const submit = (values: RolesValues) => {
    if (asksFarm && !values.farm_ids.length) {
      form.setError('farm_ids', { message: FARM_REQUIRED });
      return;
    }
    return run(async () => {
      await mutation.mutateAsync({
        role_ids: values.role_ids,
        ...(asksFarm ? { farm_ids: values.farm_ids } : {}),
      });
      notify.success('Roles actualizados');
      onDone();
    });
  };
  return (
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
            roles={roles}
            locked={locked}
            value={field.value}
            onChange={field.onChange}
            error={errors.role_ids?.message}
            disabled={isSubmitting}
          />
        )}
      />
      {asksFarm && farmsOf && (
        <Controller
          name="farm_ids"
          control={control}
          render={({ field }) => (
            <AccountFarmsField
              userId={farmsOf.userId}
              producer={farmsOf.producer}
              required
              value={field.value}
              onChange={field.onChange}
              disabled={isSubmitting}
              error={errors.farm_ids?.message}
            />
          )}
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
  );
}
