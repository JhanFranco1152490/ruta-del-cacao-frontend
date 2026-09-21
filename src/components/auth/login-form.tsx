'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { getApiErrorMessage, login, type DocumentType } from '@/lib/auth';
import { validateEmail, validateIdentifier } from '@/lib/validation';
import {
  Field,
  FormMessage,
  PasswordField,
  SubmitButton,
} from './form-controls';

export function LoginForm() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'email' | 'document'>('email');
  const [identifier, setIdentifier] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('CC');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ identifier: '', password: '' });
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      identifier:
        loginMethod === 'email'
          ? validateEmail(identifier)
          : validateIdentifier(identifier),
      password: password ? '' : 'Ingresa tu contraseña.',
    };
    setErrors(nextErrors);
    setMessage('');
    if (nextErrors.identifier || nextErrors.password) return;

    setPending(true);
    try {
      await login(
        loginMethod === 'email'
          ? { loginMethod: 'email', email: identifier.trim(), password }
          : {
              loginMethod: 'document',
              documentType,
              identityDocument: identifier.trim(),
              password,
            },
      );
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
      <div className="grid gap-2">
        <label
          htmlFor="login-method"
          className="text-sm font-bold text-[var(--forest)]"
        >
          Ingresar con
        </label>
        <select
          id="login-method"
          value={loginMethod}
          onChange={(event) => {
            setLoginMethod(event.target.value as 'email' | 'document');
            setIdentifier('');
            setErrors({ identifier: '', password: errors.password });
          }}
          className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
        >
          <option value="email">Correo electrónico</option>
          <option value="document">Documento de identidad</option>
        </select>
      </div>
      {loginMethod === 'document' && (
        <div className="grid gap-2">
          <label
            htmlFor="document-type"
            className="text-sm font-bold text-[var(--forest)]"
          >
            Tipo de documento
          </label>
          <select
            id="document-type"
            value={documentType}
            onChange={(event) =>
              setDocumentType(event.target.value as DocumentType)
            }
            className="rounded-xl border border-[var(--border)] bg-white px-4 py-3"
          >
            <option value="CC">Cédula de ciudadanía (CC)</option>
            <option value="CE">Cédula de extranjería (CE)</option>
            <option value="PPT">Permiso por Protección Temporal (PPT)</option>
          </select>
        </div>
      )}
      <Field
        id="identifier"
        label={
          loginMethod === 'email' ? 'Correo electrónico' : 'Número de documento'
        }
        name="identifier"
        autoComplete="username"
        inputMode={loginMethod === 'email' ? 'email' : 'numeric'}
        placeholder={
          loginMethod === 'email' ? 'nombre@correo.com' : 'Ej. 1090123456'
        }
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
