'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';

import { FormMessage } from '@/components/form-message';
import { PasswordField } from '@/components/password-field';
import { SelectField } from '@/components/select-field';
import { SubmitButton } from '@/components/submit-button';
import { TextField } from '@/components/text-field';
import { getErrorMessage } from '@/lib/api/errors';
import { DOCUMENT_TYPES } from '@/lib/document-types';

import { useLogin } from '../api';
import { loginSchema, toLoginRequest, type LoginFormValues } from '../schemas';

export function LoginForm() {
  const router = useRouter();
  const login = useLogin();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginMethod: 'email',
      documentType: 'CC',
      identifier: '',
      password: '',
    },
  });
  const isDocument = useWatch({ control, name: 'loginMethod' }) === 'document';

  const submit = (values: LoginFormValues) =>
    login.mutate(toLoginRequest(values), {
      onSuccess: () => router.replace('/panel'),
    });

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      <FormMessage>
        {login.isError
          ? getErrorMessage(
              login.error,
              'No fue posible iniciar sesión. Revisa tu conexión.',
            )
          : undefined}
      </FormMessage>
      <div
        className={
          isDocument
            ? 'grid grid-cols-[1fr_7rem] gap-3'
            : 'grid grid-cols-1 gap-3'
        }
      >
        <SelectField
          label="Ingresar con"
          wrapperClassName="min-w-0"
          {...register('loginMethod', {
            onChange: () => {
              setValue('identifier', '');
              clearErrors('identifier');
            },
          })}
        >
          <option value="email">Correo electrónico</option>
          <option value="document">Documento de identidad</option>
        </SelectField>
        {isDocument && (
          <SelectField
            label="Documento"
            className="pr-1 pl-2"
            {...register('documentType')}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectField>
        )}
      </div>
      <TextField
        label={isDocument ? 'Número de documento' : 'Correo electrónico'}
        autoComplete="username"
        inputMode={isDocument ? 'numeric' : 'email'}
        placeholder={isDocument ? 'Ej. 1090123456' : 'nombre@correo.com'}
        error={errors.identifier?.message}
        {...register('identifier')}
      />
      <div>
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          placeholder="Ingresa tu contraseña"
          error={errors.password?.message}
          {...register('password')}
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
      <SubmitButton pending={login.isPending}>Iniciar sesión</SubmitButton>
      <div className="flex gap-2 rounded-md bg-info-bg px-3.5 py-2.5 text-xs leading-snug font-semibold text-info">
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
