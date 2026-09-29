'use client';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { DigitsField } from '@/components/digits-field';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '@/lib/document-types';
import type { AccountDataValues } from '../schemas';

// Datos personales del alta y de la edición. Con `identityLocked` (cuenta Productor), documento
// y nombres se muestran como texto: los gobierna el expediente y no se envían.
export function AccountFields<T extends FieldValues & AccountDataValues>({
  form,
  identityLocked = false,
}: {
  form: UseFormReturn<T>;
  identityLocked?: boolean;
}) {
  // Los dos formularios comparten estos campos; el alta añade los roles, que aquí no se tocan.
  const {
    register,
    control,
    getValues,
    formState: { errors },
  } = form as unknown as UseFormReturn<AccountDataValues>;
  return (
    <>
      <TextField
        label="Correo"
        type="email"
        maxLength={254}
        error={errors.email?.message}
        {...register('email')}
      />
      {identityLocked ? (
        <section className="space-y-2 rounded-md border border-border p-4">
          <dl className="space-y-2">
            <div>
              <dt className="font-bold">Documento</dt>
              <dd>
                {DOCUMENT_TYPE_LABELS[getValues('document_type')]}{' '}
                {getValues('identity_document')}
              </dd>
            </div>
            <div>
              <dt className="font-bold">Nombre</dt>
              <dd>
                {getValues('first_name')} {getValues('last_name')}
              </dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            El documento y los nombres los gobierna el expediente del productor:
            se cambian desde allí.
          </p>
        </section>
      ) : (
        <>
          <SelectField
            label="Tipo de documento"
            error={errors.document_type?.message}
            {...register('document_type')}
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {DOCUMENT_TYPE_LABELS[type]}
              </option>
            ))}
          </SelectField>
          <DigitsField
            label="Número de documento"
            control={control}
            name="identity_document"
            maxLength={15}
          />
          <TextField
            label="Nombres"
            maxLength={150}
            error={errors.first_name?.message}
            {...register('first_name')}
          />
          <TextField
            label="Apellidos"
            maxLength={150}
            error={errors.last_name?.message}
            {...register('last_name')}
          />
        </>
      )}
      <DigitsField
        label="Teléfono (opcional)"
        type="tel"
        maxLength={10}
        control={control}
        name="phone"
      />
    </>
  );
}
