'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { getApiErrorMessage, requestPasswordReset } from '@/lib/auth';
import { validateEmail } from '@/lib/validation';
import { Field, FormMessage, SubmitButton } from './form-controls';

const SUCCESS_MESSAGE =
  'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.';

export function ResetRequestForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextError = validateEmail(email);
    setError(nextError);
    setMessage('');
    if (nextError) return;

    setPending(true);
    try {
      await requestPasswordReset(email.trim());
      setMessage(SUCCESS_MESSAGE);
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          'No pudimos enviar la solicitud. Revisa tu conexión.',
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormMessage variant="success">{message}</FormMessage>
      <Field
        id="email"
        label="Correo electrónico"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="nombre@correo.com"
        value={email}
        error={error}
        onChange={(event) => setEmail(event.target.value)}
      />
      <SubmitButton pending={pending}>Enviar</SubmitButton>
      <Link
        href="/"
        className="block text-center text-sm font-bold text-cobre underline-offset-4 hover:underline"
      >
        Volver al inicio de sesión
      </Link>
    </form>
  );
}
