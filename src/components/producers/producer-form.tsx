'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';

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
  DocumentType,
  Municipality,
  Producer,
  ProducerInput,
} from '@/lib/producers/types';
import { documentTypes } from '@/lib/producers/types';
import {
  normalizeIdentityDocument,
  type ProducerFieldErrors,
  validateProducer,
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
  if (!producer) return emptyProducer;

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

function serverFieldErrors(error: unknown): ProducerFieldErrors {
  if (!(error instanceof ApiError) || !error.body.fields) return {};

  return Object.fromEntries(
    Object.entries(error.body.fields).map(([field, messages]) => [
      field,
      messages[0],
    ]),
  ) as ProducerFieldErrors;
}

export function ProducerForm({ producer }: ProducerFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<ProducerInput>(() =>
    initialValues(producer),
  );
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [municipalitiesError, setMunicipalitiesError] = useState('');
  const [errors, setErrors] = useState<ProducerFieldErrors>({});
  const [formErrorMessage, setFormErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  function update<K extends keyof ProducerInput>(
    key: K,
    value: ProducerInput[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: ProducerInput = {
      ...values,
      identity_document: normalizeIdentityDocument(values.identity_document),
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      phone: values.phone?.trim() || null,
      email: values.email?.trim().toLowerCase() || null,
    };
    const validationErrors = validateProducer(payload);

    setErrors(validationErrors);
    setFormErrorMessage('');
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      const savedProducer = producer
        ? await updateProducer(producer.id, payload, producer.version)
        : await createProducer(payload);

      router.replace(`/producers/${savedProducer.id}`);
    } catch (error) {
      setErrors(serverFieldErrors(error));
      setFormErrorMessage(formError(error));
    } finally {
      setIsSaving(false);
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

      <form className="mt-8 space-y-6" noValidate onSubmit={handleSubmit}>
        <section className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
          <h2 className="text-2xl text-selva">Identificación</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <FieldError error={errors.document_type}>
              <Label htmlFor="document-type">Tipo de documento</Label>
              <select
                className="mt-2 h-11 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-sm font-medium"
                id="document-type"
                onChange={(event) =>
                  update('document_type', event.target.value as DocumentType)
                }
                value={values.document_type}
              >
                {documentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FieldError>
            <FieldError
              className="sm:col-span-2"
              error={errors.identity_document}
            >
              <Label htmlFor="identity-document">Número de documento</Label>
              <Input
                aria-invalid={Boolean(errors.identity_document)}
                className="mt-2 h-11 border-input bg-card"
                id="identity-document"
                inputMode="numeric"
                maxLength={15}
                onChange={(event) =>
                  update(
                    'identity_document',
                    event.target.value.replace(/[^0-9]/g, ''),
                  )
                }
                pattern="[0-9]{6,15}"
                value={values.identity_document}
              />
            </FieldError>
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
          <h2 className="text-2xl text-selva">Datos del productor</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FieldError error={errors.first_name}>
              <Label htmlFor="first-name">Nombres</Label>
              <Input
                aria-invalid={Boolean(errors.first_name)}
                className="mt-2 h-11 border-input bg-card"
                id="first-name"
                maxLength={100}
                onChange={(event) => update('first_name', event.target.value)}
                value={values.first_name}
              />
            </FieldError>
            <FieldError error={errors.last_name}>
              <Label htmlFor="last-name">Apellidos</Label>
              <Input
                aria-invalid={Boolean(errors.last_name)}
                className="mt-2 h-11 border-input bg-card"
                id="last-name"
                maxLength={100}
                onChange={(event) => update('last_name', event.target.value)}
                value={values.last_name}
              />
            </FieldError>
            <FieldError error={errors.municipality_code}>
              <Label htmlFor="municipality">Municipio</Label>
              <select
                aria-invalid={Boolean(errors.municipality_code)}
                className="mt-2 h-11 w-full rounded-[var(--radius)] border border-input bg-card px-3 text-sm"
                disabled={municipalities.length === 0}
                id="municipality"
                onChange={(event) =>
                  update('municipality_code', event.target.value)
                }
                value={values.municipality_code}
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
              {municipalitiesError && (
                <p className="mt-2 text-sm font-medium text-err" role="alert">
                  {municipalitiesError}
                </p>
              )}
            </FieldError>
            <FieldError error={errors.joined_on}>
              <Label htmlFor="joined-on">Fecha de vinculación</Label>
              <Input
                aria-invalid={Boolean(errors.joined_on)}
                className="mt-2 h-11 border-input bg-card"
                id="joined-on"
                onChange={(event) => update('joined_on', event.target.value)}
                type="date"
                value={values.joined_on}
              />
            </FieldError>
          </div>
        </section>

        <section className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
          <h2 className="text-2xl text-selva">
            Contacto{' '}
            <span className="text-base text-muted-foreground">(opcional)</span>
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FieldError error={errors.phone}>
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                aria-invalid={Boolean(errors.phone)}
                className="mt-2 h-11 border-input bg-card"
                id="phone"
                onChange={(event) =>
                  update('phone', event.target.value || null)
                }
                type="tel"
                value={values.phone ?? ''}
              />
            </FieldError>
            <FieldError error={errors.email}>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                aria-invalid={Boolean(errors.email)}
                className="mt-2 h-11 border-input bg-card"
                id="email"
                onChange={(event) =>
                  update('email', event.target.value || null)
                }
                type="email"
                value={values.email ?? ''}
              />
            </FieldError>
          </div>
        </section>

        {formErrorMessage && (
          <p
            className="rounded-[var(--radius)] bg-err-bg px-4 py-3 text-sm font-bold text-err"
            role="alert"
          >
            {formErrorMessage}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            className="inline-flex h-11 items-center justify-center rounded-[var(--radius)] border border-input bg-card px-4 text-sm font-bold hover:bg-muted"
            href={producer ? `/producers/${producer.id}` : '/producers'}
          >
            Cancelar
          </Link>
          <Button
            className="h-11 bg-selva px-6 hover:bg-selva-2"
            disabled={isSaving}
            type="submit"
          >
            {isSaving
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
