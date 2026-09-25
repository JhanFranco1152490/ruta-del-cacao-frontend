'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormMessage } from '@/components/form-message';
import { PasswordField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { applyApiFieldErrors } from '@/lib/api/form-errors';
import { getErrorMessage } from '@/lib/api/errors';

import { useConfirmPasswordReset } from '../api';
import { resetConfirmSchema, type ResetConfirmValues } from '../schemas';

const INVALID_LINK_MESSAGE =
  'El enlace de recuperación no es válido. Solicita uno nuevo.';
const SUCCESS_MESSAGE =
  'Tu contraseña fue actualizada. Ya puedes iniciar sesión.';

export function ResetConfirmForm({
  uid,
  token,
}: {
  uid?: string;
  token?: string;
}) {
  const confirm = useConfirmPasswordReset();
  const [failure, setFailure] = useState('');
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetConfirmValues>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: { new_password: '', new_password_confirmation: '' },
  });
  const validLink = Boolean(uid && token);

  const submit = (values: ResetConfirmValues) => {
    if (!uid || !token) return;
    setFailure('');
    confirm.mutate(
      { uid, token, ...values },
      {
        onError: (error) => {
          if (
            applyApiFieldErrors(error, setError, [
              'new_password',
              'new_password_confirmation',
            ])
          ) {
            return;
          }
          setFailure(
            getErrorMessage(
              error,
              'El enlace no es válido o venció. Solicita uno nuevo.',
            ),
          );
        },
      },
    );
  };

  const message = !validLink
    ? INVALID_LINK_MESSAGE
    : confirm.isSuccess
      ? SUCCESS_MESSAGE
      : failure;

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
      <FormMessage variant={confirm.isSuccess ? 'success' : 'error'}>
        {message}
      </FormMessage>
      {validLink && !confirm.isSuccess && (
        <>
          <PasswordField
            label="Nueva contraseña"
            autoComplete="new-password"
            hint="Entre 8 y 50 caracteres; puede incluir espacios y símbolos."
            error={errors.new_password?.message}
            {...register('new_password')}
          />
          <PasswordField
            label="Confirma tu nueva contraseña"
            autoComplete="new-password"
            error={errors.new_password_confirmation?.message}
            {...register('new_password_confirmation')}
          />
          <SubmitButton pending={confirm.isPending}>
            Actualizar contraseña
          </SubmitButton>
        </>
      )}
      <Link
        href={confirm.isSuccess ? '/' : '/recuperar-contrasena'}
        className="block text-center text-sm font-bold text-cobre underline-offset-4 hover:underline"
      >
        {confirm.isSuccess
          ? 'Ir al inicio de sesión'
          : 'Solicitar un enlace nuevo'}
      </Link>
    </form>
  );
}
