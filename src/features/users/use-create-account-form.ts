'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAccount, type AccountCreated } from '@/lib/api/accounts';
import {
  FARM_REQUIRED,
  accountSchema,
  emptyAccount,
  toAccountRequest,
  type AccountValues,
} from './schemas';
import { useAccountSubmit } from '@/hooks/use-account-submit';

export function useCreateAccountForm({
  producer,
  administratorRole,
  allowedRoleIds,
  needsFarm,
  onCreated,
  onBusy,
}: {
  producer?: string;
  administratorRole?: string;
  allowedRoleIds: string[];
  // Si los roles elegidos exigen una finca: la cuenta no se crea sin ella.
  needsFarm: (roleIds: string[]) => boolean;
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
    if (needsFarm(values.role_ids) && !values.farm_ids.length) {
      form.setError('farm_ids', { message: FARM_REQUIRED });
      return;
    }
    await run(async () => {
      onCreated(await mutation.mutateAsync(toAccountRequest(values, producer)));
    });
  }
  return { form, submit, failure };
}
