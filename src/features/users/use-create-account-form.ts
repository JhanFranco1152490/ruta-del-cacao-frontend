'use client';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyApiFieldErrors } from '@/lib/api/form-errors';
import { isApiError, getErrorMessage } from '@/lib/api/errors';
import { useCreateAccount, type AccountCreated } from './api';
import {
  accountSchema,
  emptyAccount,
  toAccountRequest,
  type AccountValues,
} from './schemas';

export function useCreateAccountForm({
  producer,
  administratorRole,
  allowedRoleIds,
  onCreated,
  onBusy,
}: {
  producer?: string;
  administratorRole?: string;
  allowedRoleIds: string[];
  onCreated: (account: AccountCreated) => void;
  onBusy: (value: boolean) => void;
}) {
  const mutation = useCreateAccount();
  const lock = useRef(false);
  const [failure, setFailure] = useState('');
  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      ...emptyAccount,
      role_ids: administratorRole ? [administratorRole] : [],
    },
  });
  async function submit(values: AccountValues) {
    if (lock.current) return;
    if (values.role_ids.some((id) => !allowedRoleIds.includes(id))) {
      form.setError('role_ids', {
        message: 'Alguno de los roles seleccionados ya no está disponible.',
      });
      return;
    }
    lock.current = true;
    onBusy(true);
    setFailure('');
    try {
      onCreated(await mutation.mutateAsync(toAccountRequest(values, producer)));
    } catch (error) {
      lock.current = false;
      if (isApiError(error) && error.code === 'duplicate_email')
        form.setError('email', {
          message: 'Ya existe una cuenta con este correo.',
        });
      else if (isApiError(error) && error.code === 'duplicate_document')
        form.setError('identity_document', {
          message: 'Ya existe una cuenta con este documento.',
        });
      else if (isApiError(error) && error.code === 'exceeds_own_permissions')
        form.setError('role_ids', {
          message: 'No puedes asignar todos los roles seleccionados.',
        });
      else {
        const result = applyApiFieldErrors(
          error,
          form.setError,
          Object.keys(emptyAccount),
        );
        if (!result.applied || result.unmatched.length)
          setFailure(
            result.unmatched.join(' ') ||
              (isApiError(error) && error.code === 'permission_denied'
                ? 'Ya no tienes permiso para crear esta cuenta.'
                : getErrorMessage(
                    error,
                    'No fue posible crear la cuenta. Inténtalo nuevamente.',
                  )),
          );
      }
    } finally {
      onBusy(false);
    }
  }
  return { form, submit, failure };
}
