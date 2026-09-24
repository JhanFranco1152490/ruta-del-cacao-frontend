'use client';

import { Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { getApiErrorMessage, login, type DocumentType } from '@/lib/auth';
import { validateDocument, validateEmail } from '@/lib/validation';
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
          : validateDocument(documentType, identifier),
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
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormMessage>{message}</FormMessage>
      <div
        className={`grid gap-3 ${loginMethod === 'document' ? 'grid-cols-[1fr_7rem]' : 'grid-cols-1'}`}
      >
        <div className="grid min-w-0 gap-1.5">
          <label
            htmlFor="login-method"
            className="text-sm font-bold text-selva"
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
            className="h-11 rounded-md border border-input bg-card px-3"
          >
            <option value="email">Correo electrónico</option>
            <option value="document">Documento de identidad</option>
          </select>
        </div>
        {loginMethod === 'document' && (
          <div className="grid gap-1.5">
            <label
              htmlFor="document-type"
              className="whitespace-nowrap text-sm font-bold text-selva"
            >
              Documento
            </label>
            <select
              id="document-type"
              value={documentType}
              onChange={(event) =>
                setDocumentType(event.target.value as DocumentType)
              }
              className="h-11 w-full rounded-md border border-input bg-card pl-2 pr-1"
            >
              <option value="CC">CC</option>
              <option value="CE">CE</option>
              <option value="PPT">PPT</option>
              <option value="NIT">NIT</option>
            </select>
          </div>
        )}
      </div>
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
            className="text-sm font-bold text-cobre underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>
      <SubmitButton pending={pending}>Iniciar sesión</SubmitButton>
      <div className="flex gap-2 rounded-md bg-info-bg px-3.5 py-2.5 text-xs font-semibold leading-snug text-info">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          Los usuarios los crea el administrador; pídelo en la asociación si no
          tienes uno. Tras varios intentos fallidos la cuenta se bloquea
          temporalmente.
        </p>
      </div>
    </form>
  );
}
