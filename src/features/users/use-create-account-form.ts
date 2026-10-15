'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateAccount, type AccountCreated } from '@/lib/api/accounts';
import {
  effectiveScope,
  scopeProblem,
  type RequiredScope,
} from '@/lib/farm-scope';
import {
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
  scopeOf,
  onCreated,
  onBusy,
}: {
  producer?: string;
  administratorRole?: string;
  allowedRoleIds: string[];
  // El alcance que piden los roles elegidos; `null` si la cuenta no lleva fincas (un
  // Administrador). Un empleado no se crea sin alcance.
  scopeOf: (roleIds: string[]) => RequiredScope | null;
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
    const required = scopeOf(values.role_ids);
    const problem = required && scopeProblem(required, values);
    if (problem) {
      form.setError('farm_ids', { message: problem });
      return;
    }
    await run(async () => {
      onCreated(
        await mutation.mutateAsync(
          toAccountRequest(
            // Con un rol de «siempre todas» el alcance es el que piden los roles, aunque la
            // persona no haya tocado nada.
            required
              ? { ...values, ...effectiveScope(required, values) }
              : values,
            producer,
            required !== null,
          ),
        ),
      );
    });
  }
  return { form, submit, failure };
}
