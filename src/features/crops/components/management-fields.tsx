import type { FieldErrors, UseFormRegister } from 'react-hook-form';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { SelectField } from '@/components/select-field';

import {
  MANAGEMENT_SYSTEM_OPTIONS,
  SHADE_TYPE_OPTIONS,
  STAGE_OPTIONS,
} from '../characterization-rules';
import type { CharacterizationFormInput } from '../schemas';

// La etapa del ciclo productivo es de toda la parcela, no de cada siembra; manejo y sombra son
// opcionales.
export function StageAndManagementFields({
  register,
  errors,
}: {
  register: UseFormRegister<CharacterizationFormInput>;
  errors: FieldErrors<CharacterizationFormInput>;
}) {
  return (
    <div className="grid gap-5">
      <SelectField
        className={CAPTURE_FIELD_CLASS}
        error={errors.stage?.message}
        label="Etapa del ciclo productivo"
        {...register('stage')}
      >
        <option value="">Elige la etapa</option>
        {STAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        className={CAPTURE_FIELD_CLASS}
        error={errors.management_system?.message}
        label="Sistema de manejo (opcional)"
        {...register('management_system')}
      >
        <option value="">Sin especificar</option>
        {MANAGEMENT_SYSTEM_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      <SelectField
        className={CAPTURE_FIELD_CLASS}
        error={errors.shade_type?.message}
        label="Tipo de sombra (opcional)"
        {...register('shade_type')}
      >
        <option value="">Sin especificar</option>
        {SHADE_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
