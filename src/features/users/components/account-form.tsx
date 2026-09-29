'use client';
import { Controller } from 'react-hook-form';
import { TextField } from '@/components/text-field';
import { SelectField } from '@/components/select-field';
import { DigitsField } from '@/components/digits-field';
import { CheckboxField } from '@/components/checkbox-field';
import { SubmitButton } from '@/components/submit-button';
import { Button } from '@/components/ui/button';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '@/lib/document-types';
import type { Role } from '@/lib/api/roles';
import type { AccountCreated } from '../api';
import { useCreateAccountForm } from '../use-create-account-form';

export function AccountForm({
  roles,
  administrator,
  producer,
  onCreated,
  onBusy,
  onCancel,
}: {
  roles: Role[];
  administrator: boolean;
  producer?: string;
  onCreated: (account: AccountCreated) => void;
  onBusy: (value: boolean) => void;
  onCancel: () => void;
}) {
  const { form, submit, failure } = useCreateAccountForm({
    producer,
    administratorRole: administrator ? roles[0]?.id : undefined,
    allowedRoleIds: roles.map((role) => role.id),
    onCreated,
    onBusy,
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        void handleSubmit(submit)(event);
      }}
    >
      <fieldset disabled={isSubmitting} className="space-y-4">
        <TextField
          label="Correo"
          type="email"
          maxLength={254}
          error={errors.email?.message}
          {...register('email')}
        />
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
        <DigitsField
          label="Teléfono (opcional)"
          type="tel"
          maxLength={10}
          control={control}
          name="phone"
        />
        {administrator ? (
          <p>Rol asignado: Administrador</p>
        ) : (
          <Controller
            name="role_ids"
            control={control}
            render={({ field }) => (
              <fieldset
                aria-invalid={Boolean(errors.role_ids)}
                aria-describedby={
                  errors.role_ids ? 'account-role-error' : undefined
                }
              >
                <legend className="mb-2 font-bold text-selva">
                  Roles del empleado
                </legend>
                {roles.map((role) => (
                  <CheckboxField
                    key={role.id}
                    label={role.name}
                    hint={role.description || undefined}
                    checked={field.value.includes(role.id)}
                    disabled={isSubmitting}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked
                          ? [...field.value, role.id]
                          : field.value.filter((id) => id !== role.id),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
          />
        )}
        {errors.role_ids && (
          <p id="account-role-error" role="alert" className="text-sm text-err">
            {errors.role_ids.message}
          </p>
        )}
      </fieldset>
      {failure && (
        <p role="alert" className="text-err">
          {failure}
        </p>
      )}
      <SubmitButton pending={isSubmitting} pendingLabel="Creando…">
        Crear cuenta
      </SubmitButton>
      <Button
        type="button"
        variant="outline"
        disabled={isSubmitting}
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </form>
  );
}
