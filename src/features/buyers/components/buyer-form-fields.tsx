'use client';

import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';

import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_TYPES } from '@/lib/document-types';

import {
  BUYER_CONTACT_HINT,
  BUYER_DOCUMENT_HINT,
  BUYER_NAME_HINT,
} from '../buyer-messages';
import {
  BUYER_EMAIL_MAX_LENGTH,
  BUYER_NAME_MAX_LENGTH,
  type BuyerFormInput,
  type BuyerFormValues,
} from '../buyer-schema';
import { BUYER_TYPE_OPTIONS } from '../buyer-types';

// Los siete campos de un comprador. Debajo del nombre y del documento caben los avisos de repetido
// (`nameNotice`, `documentNotice`); tipo y número de documento, y teléfono y correo, van en una fila
// desde escritorio.
export function BuyerFormFields({
  form,
  disabled,
  nameNotice,
  documentNotice,
}: {
  form: UseFormReturn<BuyerFormInput, unknown, BuyerFormValues>;
  disabled: boolean;
  nameNotice?: ReactNode;
  documentNotice?: ReactNode;
}) {
  const { errors } = form.formState;
  return (
    <>
      <TextField
        disabled={disabled}
        error={errors.name?.message}
        hint={BUYER_NAME_HINT}
        label="Nombre"
        maxLength={BUYER_NAME_MAX_LENGTH}
        placeholder="Ej.: Chocolates del Oriente S.A.S."
        {...form.register('name')}
      />
      {nameNotice}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <SelectField
          disabled={disabled}
          error={errors.document_type?.message}
          label="Tipo de documento"
          {...form.register('document_type')}
        >
          {DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {DOCUMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </SelectField>
        <TextField
          autoComplete="off"
          disabled={disabled}
          error={errors.identity_document?.message}
          hint={BUYER_DOCUMENT_HINT}
          inputMode="numeric"
          label="Número de documento"
          maxLength={15}
          {...form.register('identity_document')}
        />
      </div>
      {documentNotice}
      <SelectField
        disabled={disabled}
        error={errors.buyer_type?.message}
        label="Tipo de cliente"
        placeholder="Elige el tipo de cliente"
        {...form.register('buyer_type')}
      >
        {BUYER_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <TextField
        disabled={disabled}
        error={errors.contact_name?.message}
        hint="Opcional."
        label="Persona de contacto"
        maxLength={BUYER_NAME_MAX_LENGTH}
        {...form.register('contact_name')}
      />
      <fieldset className="space-y-2">
        <legend className="text-sm text-muted-foreground">
          {BUYER_CONTACT_HINT}
        </legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            autoComplete="off"
            disabled={disabled}
            error={errors.phone?.message}
            inputMode="numeric"
            label="Teléfono"
            maxLength={10}
            type="tel"
            {...form.register('phone')}
          />
          <TextField
            autoComplete="off"
            disabled={disabled}
            error={errors.email?.message}
            inputMode="email"
            label="Correo"
            maxLength={BUYER_EMAIL_MAX_LENGTH}
            type="email"
            {...form.register('email')}
          />
        </div>
      </fieldset>
    </>
  );
}
