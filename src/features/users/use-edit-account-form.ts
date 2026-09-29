'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateAccount, type Account } from '@/lib/api/accounts';
import {
  accountDataSchema,
  isProducerAccount,
  toAccountDataValues,
  toAccountUpdate,
  type AccountDataValues,
} from './schemas';
import { useAccountSubmit } from '@/hooks/use-account-submit';

export function useEditAccountForm({
  account,
  onSaved,
  onBusy,
}: {
  account: Account;
  onSaved: () => void;
  onBusy: (value: boolean) => void;
}) {
  const mutation = useUpdateAccount(account.id);
  const identityLocked = isProducerAccount(account);
  const form = useForm<AccountDataValues>({
    resolver: zodResolver(accountDataSchema),
    defaultValues: toAccountDataValues(account),
  });
  const { run, failure } = useAccountSubmit({
    setError: form.setError,
    // Sin los campos bloqueados, sus errores del servidor pasan al aviso general.
    fields: identityLocked
      ? ['email', 'phone']
      : Object.keys(toAccountDataValues(account)),
    messages: {
      forbidden: 'Ya no tienes permiso para editar esta cuenta.',
      fallback: 'No fue posible guardar los cambios. Inténtalo nuevamente.',
    },
    onBusy,
  });
  const submit = (values: AccountDataValues) =>
    run(async () => {
      await mutation.mutateAsync(toAccountUpdate(values, identityLocked));
      onSaved();
    });
  return { form, submit, failure, identityLocked };
}
