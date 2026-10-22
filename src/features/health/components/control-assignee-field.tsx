'use client';

import { Controller, get, useFormContext } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { SearchSelect } from '@/components/search-select';

import { useControlChoices } from '../control-choices';

// Quién hace (o hizo) el control: alguien que trabaja en la finca de la parcela. `name` es la ruta
// del campo en el formulario que lo usa.
export function ControlAssigneeField({
  name,
  disabled,
}: {
  name: string;
  disabled: boolean;
}) {
  const { control, formState } = useFormContext();
  const { assignees } = useControlChoices();
  const error = (
    get(formState.errors, name) as { message?: string } | undefined
  )?.message;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <SearchSelect
          disabled={disabled}
          error={error}
          inputClassName={CAPTURE_FIELD_CLASS}
          label="Responsable"
          onBlur={field.onBlur}
          onChange={(option) => field.onChange(option?.id ?? '')}
          options={assignees}
          placeholder="Elige quién lo hace"
          value={assignees.find(({ id }) => id === field.value) ?? null}
        />
      )}
    />
  );
}
