'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { UserRoundPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { FormDialogForm } from '@/components/form-dialog';
import { useCreateAccount, type AccountCreated } from '@/lib/api/accounts';
import { isEmail } from '@/lib/validation/is-email';
import { useAccountSubmit } from '@/hooks/use-account-submit';

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .refine(isEmail, 'Ingresa un correo electrónico válido.'),
});
type EmailValues = z.infer<typeof emailSchema>;

// Cuenta Productor de un expediente registrado antes de que se creara sola: solo se pide el
// correo; documento y nombres los copia el servidor del expediente.
export function ProducerAccountCreateDialog({
  producerId,
  producerRoleId,
  email,
  onCreated,
}: {
  producerId: string;
  producerRoleId: string;
  email: string | null;
  onCreated: (account: AccountCreated) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const mutation = useCreateAccount();
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: email ?? '' },
  });
  const { run, failure } = useAccountSubmit({
    setError: form.setError,
    fields: ['email'],
    messages: {
      forbidden: 'Ya no tienes permiso para crear esta cuenta.',
      fallback: 'No fue posible crear la cuenta. Inténtalo nuevamente.',
    },
    onBusy: setBusy,
  });
  const submit = (values: EmailValues) =>
    run(async () => {
      const account = await mutation.mutateAsync({
        email: values.email.toLowerCase(),
        role_ids: [producerRoleId],
        producer_id: producerId,
      });
      setOpen(false);
      onCreated(account);
    });
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) setOpen(next);
      }}
    >
      <DialogTrigger render={<Button className="h-11" />}>
        <UserRoundPlus aria-hidden="true" className="size-4" /> Crear cuenta de
        acceso
      </DialogTrigger>
      <DialogContent showCloseButton={!busy}>
        <FormDialogForm
          description="Se enviará un enlace a este correo para que el productor elija su contraseña. El documento y los nombres se toman del expediente."
          error={failure}
          isSaving={busy}
          onSubmit={(event) => {
            void form.handleSubmit(submit)(event);
          }}
          pendingLabel="Creando…"
          submitLabel="Crear cuenta"
          title="Crear cuenta de acceso"
        >
          <TextField
            label="Correo"
            type="email"
            maxLength={254}
            disabled={busy}
            error={errors.email?.message}
            {...register('email')}
          />
        </FormDialogForm>
      </DialogContent>
    </Dialog>
  );
}
