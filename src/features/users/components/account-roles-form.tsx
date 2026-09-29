'use client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import type { Role } from '@/lib/api/roles';
import { useSetAccountRoles, type Account } from '../api';
import { roleIdsSchema } from '../schemas';
import { useAccountSubmit } from '@/hooks/use-account-submit';
import { RoleCheckboxes } from './role-checkboxes';

const rolesSchema = z.object({ role_ids: roleIdsSchema });
type RolesValues = z.infer<typeof rolesSchema>;

export function AccountRolesForm({
  account,
  roles,
  onDone,
  onBusy,
}: {
  account: Account;
  roles: Role[];
  onDone: () => void;
  onBusy: (value: boolean) => void;
}) {
  const mutation = useSetAccountRoles(account.id);
  const assignable = new Set(roles.map((role) => role.id));
  const locked = account.roles.filter((role) => !assignable.has(role.id));
  const form = useForm<RolesValues>({
    resolver: zodResolver(rolesSchema),
    defaultValues: { role_ids: account.roles.map((role) => role.id) },
  });
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;
  const { run, failure } = useAccountSubmit({
    setError: form.setError,
    fields: ['role_ids'],
    messages: {
      forbidden: 'Ya no tienes permiso para cambiar los roles.',
      fallback: 'No fue posible guardar los roles. Inténtalo nuevamente.',
    },
    onBusy,
  });
  const submit = (values: RolesValues) =>
    run(async () => {
      await mutation.mutateAsync(values.role_ids);
      onDone();
    });
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
