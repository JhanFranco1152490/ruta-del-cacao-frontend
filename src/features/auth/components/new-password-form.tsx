'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FormMessage } from '@/components/form-message';
import { PasswordField } from '@/components/password-field';
import { SubmitButton } from '@/components/submit-button';
import { applyApiFieldErrors } from '@/lib/api/form-errors';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';

import { resetConfirmSchema, type ResetConfirmValues } from '../schemas';

export type NewPasswordFormProps = {
  uid?: string;
  token?: string;
  confirm: (
    body: components['schemas']['ActivationConfirmRequest'],
  ) => Promise<void>;
  submitLabel: string;
  invalidLinkMessage: string;
  successMessage: string;
  fallbackMessage: string;
  errorMessage?: (error: unknown) => string | undefined;
  // Código con el que el servidor rechaza un enlace ya usado o vencido: al recibirlo se
  // quita el formulario, porque ninguna contraseña nueva lo va a hacer funcionar.
  invalidTokenCode: string;
  recovery?: boolean;
};

export function NewPasswordForm({
  uid,
  token,
  confirm,
  submitLabel,
  invalidLinkMessage,
  successMessage,
  fallbackMessage,
  errorMessage,
  invalidTokenCode,
  recovery = false,
}: NewPasswordFormProps) {
  const [isSuccess, setSuccess] = useState(false);
  const [isLinkRejected, setLinkRejected] = useState(false);
  const [failure, setFailure] = useState('');
  const [isPending, setPending] = useState(false);
  const sending = useRef(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetConfirmValues>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: { new_password: '', new_password_confirmation: '' },
  });
  const validLink = Boolean(uid && token);

  const submit = async (values: ResetConfirmValues) => {
    if (!uid || !token || sending.current || isSuccess) return;
    sending.current = true;
    setPending(true);
    setFailure('');
    try {
      await confirm({ uid, token, ...values });
      setSuccess(true);
    } catch (error) {
      sending.current = false;
      if (isApiError(error) && error.code === invalidTokenCode) {
        setLinkRejected(true);
        setFailure(errorMessage?.(error) ?? error.message);
        return;
      }
      const mapped = applyApiFieldErrors(error, setError, [
        'new_password',
        'new_password_confirmation',
      ]);
      if (mapped.applied && !mapped.unmatched.length) return;
      const detail =
        errorMessage?.(error) ?? getErrorMessage(error, fallbackMessage);
      setFailure([...new Set([detail, ...mapped.unmatched])].join(' '));
    } finally {
      setPending(false);
    }
  };
  const message = !validLink
    ? invalidLinkMessage
    : isSuccess
      ? successMessage
      : failure;

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(submit, () => setFailure(''))(event);
      }}
      noValidate
      className="space-y-5"
    >
      <FormMessage variant={isSuccess ? 'success' : 'error'}>
        {message}
      </FormMessage>
      {validLink && !isSuccess && !isLinkRejected && (
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
          <SubmitButton pending={isSubmitting || isPending}>
            {submitLabel}
          </SubmitButton>
        </>
      )}
      <Link
        href={isSuccess || !recovery ? '/' : '/recuperar-contrasena'}
        className="block text-center text-sm font-bold text-cobre underline-offset-4 hover:underline"
      >
        {isSuccess || !recovery
          ? 'Ir al inicio de sesión'
          : 'Solicitar un enlace nuevo'}
      </Link>
    </form>
  );
}
