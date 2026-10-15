'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateAccount, type Account } from '@/lib/api/accounts';
import {
  accountEditSchema,
  isProducerAccount,
  sameFarms,
  toAccountEditValues,
  toAccountUpdate,
  type AccountEditValues,
} from './schemas';
import { useAccountSubmit } from '@/hooks/use-account-submit';
import { notify } from '@/lib/notify';

export function useEditAccountForm({
  account,
  withFarm,
  onSaved,
  onBusy,
}: {
  account: Account;
  // Si quien edita puede asignar la finca de esta cuenta: solo entonces viaja en la petición.
  withFarm: boolean;
  onSaved: () => void;
  onBusy: (value: boolean) => void;
}) {
  const mutation = useUpdateAccount(account.id);
  const identityLocked = isProducerAccount(account);
  const form = useForm<AccountEditValues>({
    resolver: zodResolver(accountEditSchema),
    defaultValues: toAccountEditValues(account),
  });
  const { run, failure } = useAccountSubmit({
    setError: form.setError,
    // Sin los campos bloqueados, sus errores del servidor pasan al aviso general.
    fields: identityLocked
      ? ['email', 'phone']
      : Object.keys(toAccountEditValues(account)),
    messages: {
      forbidden: 'Ya no tienes permiso para editar esta cuenta.',
      fallback: 'No fue posible guardar los cambios. Inténtalo nuevamente.',
    },
    onBusy,
  });
  const initialFarms = account.farms.map((farm) => farm.id);
  const submit = (values: AccountEditValues) =>
    run(async () => {
      // Solo si cambiaron: corregir el teléfono de alguien no reabre la decisión de sus fincas.
      const farmsChanged =
        withFarm && !sameFarms(values.farm_ids, initialFarms);
      await mutation.mutateAsync(
        toAccountUpdate(values, identityLocked, farmsChanged),
      );
      notify.success('Cuenta actualizada');
      onSaved();
    });
  return { form, submit, failure, identityLocked };
}
