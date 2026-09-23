'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { Controller, type UseFormSetError, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ApiError,
  createProducer,
  getMunicipalities,
  updateProducer,
} from '@/lib/producers/api';
import type {
  Municipality,
  Producer,
  ProducerInput,
} from '@/lib/producers/types';
import { documentTypes } from '@/lib/producers/types';
import {
  normalizeProducerInput,
  producerFormSchema,
} from '@/lib/producers/validation';

type ProducerFormProps = {
  producer?: Producer;
};

const emptyProducer: ProducerInput = {
  document_type: 'CC',
  identity_document: '',
  first_name: '',
  last_name: '',
  phone: null,
  email: null,
  municipality_code: '',
  joined_on: '',
};

function initialValues(producer?: Producer): ProducerInput {
  if (!producer) return { ...emptyProducer };

  return {
    document_type: producer.document_type,
    identity_document: producer.identity_document,
    first_name: producer.first_name,
    last_name: producer.last_name,
    phone: producer.phone,
    email: producer.email,
    municipality_code: producer.municipality_code,
    joined_on: producer.joined_on,
  };
}

function formError(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'No fue posible guardar el productor. Revisa tu conexión e inténtalo de nuevo.';
}

function applyServerFieldErrors(
  error: unknown,
  setError: UseFormSetError<ProducerInput>,
) {
  if (!(error instanceof ApiError) || !error.body.fields) return;

  const fields = Object.entries(error.body.fields);
  for (const [field, messages] of fields) {
    if (!(field in emptyProducer)) continue;
    setError(field as keyof ProducerInput, {
      type: 'server',
      message: messages[0],
    });
  }
}

export function ProducerForm({ producer }: ProducerFormProps) {
  const router = useRouter();
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [municipalitiesError, setMunicipalitiesError] = useState('');
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<ProducerInput>({
    defaultValues: initialValues(producer),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    resolver: zodResolver(producerFormSchema),
  });

  useEffect(() => {
    const controller = new AbortController();

    getMunicipalities(controller.signal)
      .then(setMunicipalities)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
        setMunicipalitiesError(
          'No fue posible cargar los municipios. Inténtalo nuevamente.',
        );
      });

    return () => controller.abort();
  }, []);

  async function saveProducer(values: ProducerInput) {
    const payload = normalizeProducerInput(values);
    setFormErrorMessage('');

    try {
      const savedProducer = producer
        ? await updateProducer(producer.id, payload, producer.version)
        : await createProducer(payload);

      router.replace(`/producers/${savedProducer.id}`);
    } catch (error) {
      applyServerFieldErrors(error, setError);
      setFormErrorMessage(formError(error));
    }
  }

  const title = producer ? 'Editar productor' : 'Registrar productor';

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8">
      <Link
        className="text-sm font-bold text-selva-2 hover:underline"
        href="/producers"
      >
        ← Volver a productores
      </Link>
      <div className="mt-5 flex flex-col gap-2">
        <p className="section-label">Administración</p>
        <h1 className="text-4xl text-selva">{title}</h1>
        <p className="max-w-2xl text-muted-foreground">
          Los campos marcados son obligatorios. El productor puede vincular una
          cuenta de acceso posteriormente.
        </p>
      </div>

      <form
        className="mt-8 space-y-6"
        noValidate
        onSubmit={handleSubmit(saveProducer)}
      >
        <section className="rounded-(--radius-card) bg-card p-5 shadow-card">
          <h2 className="text-2xl text-selva">Identificación</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <FieldError error={errors.document_type?.message}>
              <Label htmlFor="document-type">Tipo de documento</Label>
              <Controller
                control={control}
                name="document_type"
                render={({ field }) => (
                  <select
                    className="mt-2 h-11 w-full rounded-(--radius) border border-input bg-card px-3 text-sm font-medium"
                    id="document-type"
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value)}
                    ref={field.ref}
                    value={field.value}
                  >
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FieldError>
            <FieldError
              className="sm:col-span-2"
              error={errors.identity_document?.message}
            >
              <Label htmlFor="identity-document">Número de documento</Label>
              <Controller
                control={control}
                name="identity_document"
                render={({ field }) => (
                  <Input
                    aria-invalid={Boolean(errors.identity_document)}
                    className="mt-2 h-11 border-input bg-card"
                    id="identity-document"
                    inputMode="numeric"
                    maxLength={15}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value.replace(/[^0-9]/g, ''))
                    }
                    pattern="[0-9]{6,15}"
                    ref={field.ref}
                    value={field.value}
                  />
                )}
              />
            </FieldError>
          </div>
        </section>

        <section className="rounded-(--radius-card) bg-card p-5 shadow-card">
          <h2 className="text-2xl text-selva">Datos del productor</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FieldError error={errors.first_name?.message}>
              <Label htmlFor="first-name">Nombres</Label>
              <Controller
                control={control}
                name="first_name"
                render={({ field }) => (
                  <Input
                    aria-invalid={Boolean(errors.first_name)}
                    className="mt-2 h-11 border-input bg-card"
                    id="first-name"
                    maxLength={100}
                    {...field}
                  />
                )}
              />
            </FieldError>
            <FieldError error={errors.last_name?.message}>
              <Label htmlFor="last-name">Apellidos</Label>
              <Controller
                control={control}
                name="last_name"
                render={({ field }) => (
                  <Input
                    aria-invalid={Boolean(errors.last_name)}
                    className="mt-2 h-11 border-input bg-card"
                    id="last-name"
                    maxLength={100}
                    {...field}
                  />
                )}
              />
            </FieldError>
            <FieldError error={errors.municipality_code?.message}>
              <Label htmlFor="municipality">Municipio</Label>
              <Controller
                control={control}
                name="municipality_code"
                render={({ field }) => (
                  <select
                    aria-invalid={Boolean(errors.municipality_code)}
                    className="mt-2 h-11 w-full rounded-(--radius) border border-input bg-card px-3 text-sm"
                    disabled={municipalities.length === 0}
                    id="municipality"
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value)}
                    ref={field.ref}
                    value={field.value}
                  >
                    <option value="">
                      {municipalities.length === 0
                        ? 'Cargando municipios…'
                        : 'Selecciona un municipio'}
                    </option>
                    {municipalities.map((municipality) => (
                      <option key={municipality.code} value={municipality.code}>
                        {municipality.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {municipalitiesError && (
                <p className="mt-2 text-sm font-medium text-err" role="alert">
                  {municipalitiesError}
                </p>
              )}
            </FieldError>
            <FieldError error={errors.joined_on?.message}>
              <Label htmlFor="joined-on">Fecha de vinculación</Label>
              <Controller
                control={control}
                name="joined_on"
                render={({ field }) => (
                  <Input
                    aria-invalid={Boolean(errors.joined_on)}
                    className="mt-2 h-11 border-input bg-card"
                    id="joined-on"
                    type="date"
                    {...field}
                  />
                )}
              />
            </FieldError>
          </div>
        </section>

        <section className="rounded-(--radius-card) bg-card p-5 shadow-card">
          <h2 className="text-2xl text-selva">
            Contacto{' '}
            <span className="text-base text-muted-foreground">(opcional)</span>
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FieldError error={errors.phone?.message}>
              <Label htmlFor="phone">Teléfono</Label>
              <Controller
                control={control}
                name="phone"
                render={({ field }) => (
                  <Input
                    aria-invalid={Boolean(errors.phone)}
                    className="mt-2 h-11 border-input bg-card"
                    id="phone"
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value.replace(/[^0-9]/g, '') || null,
                      )
                    }
                    ref={field.ref}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{7,10}"
                    value={field.value ?? ''}
                  />
                )}
              />
            </FieldError>
            <FieldError error={errors.email?.message}>
              <Label htmlFor="email">Correo electrónico</Label>
              <Controller
                control={control}
                name="email"
                render={({ field }) => (
                  <Input
                    aria-invalid={Boolean(errors.email)}
                    className="mt-2 h-11 border-input bg-card"
                    id="email"
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.value || null)
                    }
                    ref={field.ref}
                    type="email"
                    value={field.value ?? ''}
                  />
                )}
              />
            </FieldError>
          </div>
        </section>

        {formErrorMessage && (
          <p
            className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err"
            role="alert"
          >
            {formErrorMessage}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-(--radius) border border-input bg-card px-4 text-sm font-bold hover:bg-muted"
            href={producer ? `/producers/${producer.id}` : '/producers'}
          >
            Cancelar
          </Link>
          <Button
            className="h-11 bg-selva px-6 hover:bg-selva-2"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? 'Guardando…'
              : producer
                ? 'Guardar cambios'
                : 'Guardar productor'}
          </Button>
        </div>
      </form>
    </main>
  );
}

function FieldError({
  children,
  className = '',
  error,
}: {
  children: ReactNode;
  className?: string;
  error?: string;
}) {
  return (
    <div className={className}>
      {children}
      {error && (
        <p className="mt-2 text-sm font-bold text-err" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
