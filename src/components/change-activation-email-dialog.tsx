'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAccountSubmit } from '@/hooks/use-account-submit';
import { useResendActivation, useUpdateAccount } from '@/lib/api/accounts';
import { isEmail } from '@/lib/validation/is-email';

const normalize = (email: string) => email.trim().toLowerCase();

// Corregir el correo de una cuenta que todavía no se activó (casi siempre porque se escribió mal) y
// mandar el enlace al correo nuevo en el mismo paso. El enlace anterior deja de servir: el servidor
// lo ata al correo de la cuenta, así que quien tenga el viejo no puede activarla.
export function ChangeActivationEmailDialog({
  id,
  email,
  onBusy,
  onSent,
}: {
  id: string;
  // El correo actual de la cuenta: el nuevo tiene que ser distinto.
  email: string;
  onBusy: (value: boolean) => void;
  // Si el correo nuevo ya se guardó, dice si el enlace salió.
  onSent: (sent: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const update = useUpdateAccount(id);
  const resend = useResendActivation();
  const schema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .trim()
          .max(254)
          .refine(isEmail, 'Ingresa un correo electrónico válido.')
          .refine(
            (value) => normalize(value) !== normalize(email),
            'Ingresa un correo distinto al actual.',
          ),
      }),
    [email],
  );
  const form = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email },
  });
  const { run, failure } = useAccountSubmit({
    setError: form.setError,
    fields: ['email'],
    messages: {
      forbidden: 'Ya no tienes permiso para cambiar este correo.',
      fallback: 'No fue posible cambiar el correo. Inténtalo nuevamente.',
    },
    onBusy: (value) => {
      setBusy(value);
      onBusy(value);
    },
  });
  const submit = (values: { email: string }) =>
    run(async () => {
      await update.mutateAsync({ email: normalize(values.email) });
      // El correo ya cambió: si el envío falla, no se vuelve a pedir el cambio sino el reenvío.
      let sent = false;
      try {
        sent = (await resend.mutateAsync(id)).activation_email_sent;
      } catch {
        sent = false;
      }
      setOpen(false);
      onSent(sent);
    });
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (next) form.reset({ email });
        setOpen(next);
      }}
    >
      <DialogTrigger render={<Button className="h-11" variant="outline" />}>
        <Mail aria-hidden="true" className="size-4" /> Cambiar correo
      </DialogTrigger>
      <DialogContent showCloseButton={!busy}>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            void form.handleSubmit(submit)(event);
          }}
        >
          <DialogHeader>
            <DialogTitle>Cambiar correo de activación</DialogTitle>
            <DialogDescription>
              Se envía un enlace nuevo a este correo. El enlace anterior deja de
              servir.
            </DialogDescription>
          </DialogHeader>
          <TextField
            disabled={busy}
            error={errors.email?.message}
            label="Correo"
            maxLength={254}
            type="email"
            {...register('email')}
          />
          {failure && (
            <p className="text-sm font-bold text-err" role="alert">
              {failure}
            </p>
          )}
          <DialogFooter>
            <DialogClose disabled={busy} render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <SubmitButton
              className="sm:w-auto"
              pending={busy}
              pendingLabel="Guardando…"
            >
              Guardar y reenviar
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
