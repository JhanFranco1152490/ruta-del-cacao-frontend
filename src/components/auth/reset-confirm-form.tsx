'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { confirmPasswordReset, getApiErrorMessage } from '@/lib/auth';
import { validatePassword } from '@/lib/validation';
import { FormMessage, PasswordField, SubmitButton } from './form-controls';

export function ResetConfirmForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState({ password: '', confirmation: '' });
  const [message, setMessage] = useState(
    token ? '' : 'El enlace de recuperación no es válido. Solicita uno nuevo.',
  );
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      password: validatePassword(password),
      confirmation:
        confirmation === password ? '' : 'Las contraseñas no coinciden.',
    };
    setErrors(nextErrors);
    setMessage('');
    if (!token || nextErrors.password || nextErrors.confirmation) return;

    setPending(true);
    try {
      await confirmPasswordReset(token, password);
      setSuccess(true);
      setMessage('Tu contraseña fue actualizada. Ya puedes iniciar sesión.');
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          'El enlace no es válido o venció. Solicita uno nuevo.',
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormMessage variant={success ? 'success' : 'error'}>
        {message}
      </FormMessage>
      {!success && token && (
        <>
          <PasswordField
            id="new-password"
            label="Nueva contraseña"
            name="new-password"
            autoComplete="new-password"
            value={password}
            error={errors.password}
            hint="Entre 8 y 50 caracteres; puede incluir espacios y símbolos."
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordField
            id="confirm-password"
            label="Confirma tu nueva contraseña"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmation}
            error={errors.confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
          <SubmitButton pending={pending}>Actualizar contraseña</SubmitButton>
        </>
      )}
      <Link
        href={success ? '/' : '/recuperar-contrasena'}
        className="block text-center text-sm font-bold text-[var(--copper)] underline-offset-4 hover:underline"
      >
        {success ? 'Ir al inicio de sesión' : 'Solicitar un enlace nuevo'}
      </Link>
    </form>
  );
}
