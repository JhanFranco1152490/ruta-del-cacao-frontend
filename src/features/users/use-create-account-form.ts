'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAccount, type AccountCreated } from './api';
import {
  accountSchema,
  emptyAccount,
  toAccountRequest,
  type AccountValues,
} from './schemas';
import { useAccountSubmit } from './use-account-submit';

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
  const form = useForm<AccountValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      ...emptyAccount,
      role_ids: administratorRole ? [administratorRole] : [],
    },
  });
  const { run, failure } = useAccountSubmit({
    setError: form.setError,
    fields: Object.keys(emptyAccount),
    messages: {
      forbidden: 'Ya no tienes permiso para crear esta cuenta.',
      fallback: 'No fue posible crear la cuenta. Inténtalo nuevamente.',
    },
    onBusy,
    keepLocked: true,
  });
  async function submit(values: AccountValues) {
    if (values.role_ids.some((id) => !allowedRoleIds.includes(id))) {
      form.setError('role_ids', {
        message: 'Alguno de los roles seleccionados ya no está disponible.',
      });
      return;
    }
    await run(async () => {
      onCreated(await mutation.mutateAsync(toAccountRequest(values, producer)));
    });
  }
  return { form, submit, failure };
}
