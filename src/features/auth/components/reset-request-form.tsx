'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { getErrorMessage } from '@/lib/api/errors';

import { useRequestPasswordReset } from '../api';
import { resetRequestSchema, type ResetRequestValues } from '../schemas';

const SUCCESS_MESSAGE =
  'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.';

export function ResetRequestForm() {
  const request = useRequestPasswordReset();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetRequestValues>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: { email: '' },
  });

  const submit = ({ email }: ResetRequestValues) =>
    request.mutate(email, {
      onError: (error) =>
        setError('email', {
          type: 'server',
          message: getErrorMessage(
            error,
            'No pudimos enviar la solicitud. Revisa tu conexión.',
          ),
        }),
    });

  return (
    <form
      onSubmit={handleSubmit(submit, () => request.reset())}
      noValidate
      className="space-y-5"
    >
      <FormMessage variant="success">
        {request.isSuccess ? SUCCESS_MESSAGE : undefined}
      </FormMessage>
      <TextField
        label="Correo electrónico"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="nombre@correo.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <SubmitButton pending={request.isPending}>Enviar</SubmitButton>
      <Link
        href="/"
        className="block text-center text-sm font-bold text-cobre underline-offset-4 hover:underline"
      >
        Volver al inicio de sesión
      </Link>
    </form>
  );
}
