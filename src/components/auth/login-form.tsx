'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { getApiErrorMessage, login } from '@/lib/auth';
import { validateIdentifier } from '@/lib/validation';
import {
  Field,
  FormMessage,
  PasswordField,
  SubmitButton,
} from './form-controls';

export function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ identifier: '', password: '' });
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      identifier: validateIdentifier(identifier),
      password: password ? '' : 'Ingresa tu contraseña.',
    };
    setErrors(nextErrors);
    setMessage('');
    if (nextErrors.identifier || nextErrors.password) return;

    setPending(true);
    try {
      await login(identifier.trim(), password);
      router.replace('/panel');
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          'No fue posible iniciar sesión. Revisa tu conexión.',
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormMessage>{message}</FormMessage>
      <Field
        id="identifier"
        label="Documento o correo electrónico"
        name="identifier"
        autoComplete="username"
        inputMode="email"
        placeholder="Ej. 1090123456 o nombre@correo.com"
        value={identifier}
        error={errors.identifier}
        onChange={(event) => setIdentifier(event.target.value)}
      />
      <div>
        <PasswordField
          id="password"
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          placeholder="Ingresa tu contraseña"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="mt-3 text-right">
          <Link
            href="/recuperar-contrasena"
            className="text-sm font-bold text-[var(--copper)] underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
      <SubmitButton pending={pending}>Iniciar sesión</SubmitButton>
      <p className="text-center text-sm leading-6 text-[var(--muted)]">
        El acceso es exclusivo para usuarios registrados por la organización.
      </p>
    </form>
  );
}
