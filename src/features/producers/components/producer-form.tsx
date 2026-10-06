'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Breadcrumb } from '@/components/breadcrumb';
import { MunicipalitySelectField } from '@/components/municipality-select-field';
import { DigitsField } from '@/components/digits-field';
import { FormSection } from '@/components/form-section';
import { PageHeader } from '@/components/page-header';
import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { Button, buttonVariants } from '@/components/ui/button';
import { DOCUMENT_TYPES } from '@/lib/document-types';

import type { Producer } from '../api';
import {
  emptyProducerForm,
  producerFormSchema,
  producerCreateFormSchema,
  toFormValues,
  type ProducerFormValues,
} from '../schemas';
import { useProducerSave } from '../use-producer-save';

export function ProducerForm({
  producer: initialProducer,
}: {
  producer?: Producer;
}) {
  // Los valores iniciales del formulario y la versión con la que se guarda salen de esta misma
  // ficha, fijada al montar. Si la ficha se vuelve a pedir en segundo plano y llega una versión
  // más nueva, el formulario no la adopta: guardar con la versión nueva y los valores viejos
  // haría que el servidor aceptara el cambio y pisara lo que otra persona guardó.
  const [producer] = useState(initialProducer);
  const submitLabel = producer ? 'Guardar cambios' : 'Guardar productor';
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProducerFormValues>({
    resolver: zodResolver(
      producer ? producerFormSchema : producerCreateFormSchema,
    ),
    defaultValues: producer ? toFormValues(producer) : emptyProducerForm,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
  const { save, isSaving, generalError, clearError } = useProducerSave(
    producer,
    setError,
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <Breadcrumb
        items={[
          { label: 'Productores', href: '/productores' },
          ...(producer
            ? [
                {
                  label: `${producer.first_name} ${producer.last_name}`,
                  href: `/productores/${producer.id}`,
                },
                { label: 'Editar' },
              ]
            : [{ label: 'Registrar productor' }]),
        ]}
      />
      <PageHeader
        className="mt-5"
        eyebrow="Administración"
        title={producer ? 'Editar productor' : 'Registrar productor'}
        description={
          producer
            ? 'Actualiza los datos del expediente. El correo de contacto es independiente del correo de acceso.'
            : 'El correo es obligatorio: al registrar el productor se crea también su cuenta de acceso.'
        }
      />
      <form
        className="mt-8 grid items-start gap-6 lg:grid-cols-2"
        noValidate
        onSubmit={handleSubmit(save, clearError)}
      >
        <div className="space-y-6">
          <FormSection title="Identificación">
            <div className="grid gap-5 sm:grid-cols-3">
              <SelectField
                label="Tipo de documento"
                error={errors.document_type?.message}
                {...register('document_type')}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </SelectField>
              <DigitsField
                control={control}
                name="identity_document"
                label="Número de documento"
                maxLength={15}
                wrapperClassName="sm:col-span-2"
              />
            </div>
          </FormSection>

          <FormSection title="Contacto">
            <div className="grid gap-5 sm:grid-cols-2">
              <DigitsField
                control={control}
                name="phone"
                label="Teléfono"
                type="tel"
                maxLength={10}
              />
              <TextField
                label="Correo electrónico"
                type="email"
                required={!producer}
                error={errors.email?.message}
                {...register('email')}
              />
            </div>
          </FormSection>
        </div>

        <FormSection title="Datos del productor">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Nombres"
              maxLength={100}
              error={errors.first_name?.message}
              {...register('first_name')}
            />
            <TextField
              label="Apellidos"
              maxLength={100}
              error={errors.last_name?.message}
              {...register('last_name')}
            />
            <MunicipalitySelectField
              label="Municipio"
              error={errors.municipality_code?.message}
              {...register('municipality_code')}
            />
            <TextField
              label="Fecha de vinculación"
              type="date"
              error={errors.joined_on?.message}
              {...register('joined_on')}
            />
          </div>
        </FormSection>

        {generalError && (
          <p
            className="rounded-(--radius) bg-err-bg px-4 py-3 text-sm font-bold text-err lg:col-span-2"
            role="alert"
          >
            {generalError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end lg:col-span-2">
          <Link
            className={buttonVariants({
              variant: 'outline',
              size: 'office',
              className: 'border-input bg-card px-4',
            })}
            href={producer ? `/productores/${producer.id}` : '/productores'}
          >
            Cancelar
          </Link>
          <Button className="h-11 px-6" disabled={isSaving} type="submit">
            {isSaving ? 'Guardando…' : submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
