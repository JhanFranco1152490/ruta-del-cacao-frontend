'use client';
import { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@/components/text-field';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api/form-errors';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import {
  useCreateRole,
  useUpdateRole,
  type Role,
  type PermissionItem,
} from '../api';
import {
  roleSchema,
  roleDefaults,
  toRoleRequest,
  type RoleValues,
} from '../schemas';
import { RolePermissionPicker } from './role-permission-picker';

export function RoleForm({
  role,
  catalog,
  producer,
  onSaved,
  onCancel,
  onBusy,
}: {
  role?: Role;
  catalog: PermissionItem[];
  producer?: string;
  onSaved: (role: Role) => void;
  onCancel: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const create = useCreateRole();
  const update = useUpdateRole();
  const lock = useRef(false);
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: roleDefaults(role),
  });
  async function submit(values: RoleValues) {
    if (lock.current) return;
    lock.current = true;
    onBusy(true);
    setFailure('');
    try {
      const saved = role
        ? await update.mutateAsync({ id: role.id, input: values })
        : await create.mutateAsync(toRoleRequest(values, producer));
      onSaved(saved);
    } catch (error) {
      lock.current = false;
      if (isApiError(error) && error.code === 'duplicate_role_name') {
        setError('name', { message: 'Ya existe un rol con este nombre.' });
      } else if (
        isApiError(error) &&
        error.code === 'exceeds_own_permissions'
      ) {
        setError('permission_codes', {
          message: 'No puedes conceder todos los permisos seleccionados.',
        });
      } else if (isApiError(error) && error.code === 'self_role_lockout') {
        // Editar un rol propio sin dejar de gestionar roles: el servidor explica qué hacer.
        setError('permission_codes', { message: error.message });
      } else {
        const result = applyApiFieldErrors(error, setError, [
          'name',
          'description',
          'permission_codes',
        ]);
        if (!result.applied || result.unmatched.length)
          setFailure(
            result.unmatched.join(' ') ||
              getErrorMessage(
                error,
                'No fue posible guardar el rol. Inténtalo nuevamente.',
              ),
          );
      }
    } finally {
      onBusy(false);
    }
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
    >
      <fieldset disabled={isSubmitting} className="space-y-5">
        <TextField
          label="Nombre"
          maxLength={100}
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Descripción"
          maxLength={255}
          error={errors.description?.message}
          {...register('description')}
        />
        <Controller
          name="permission_codes"
          control={control}
          render={({ field }) => (
            <RolePermissionPicker
              catalog={catalog}
              value={field.value}
              onChange={field.onChange}
              disabled={isSubmitting}
              error={errors.permission_codes?.message}
            />
          )}
        />
      </fieldset>
      {failure && (
        <p role="alert" className="text-err">
          {failure}
        </p>
      )}
      <SubmitButton pending={isSubmitting} pendingLabel="Guardando…">
        Guardar rol
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
