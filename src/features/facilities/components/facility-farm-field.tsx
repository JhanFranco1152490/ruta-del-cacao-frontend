'use client';

import type { UseFormReturn } from 'react-hook-form';

import { SearchSelect } from '@/components/search-select';
import { InlineError } from '@/components/form-message';
import type { FarmOption } from '@/lib/api/farm-options';
import { farmLabel } from '@/lib/format/place-label';

import type { FacilityFormInput, FacilityFormValues } from '../facility-form';

// Al registrar se elige entre las fincas activas que la cuenta alcanza; con una sola, va fija. Al
// editar va siempre fija: un cajón está construido en su finca y no se muda.
export function FacilityFarmField({
  form,
  farms,
  fixedFarm,
  error,
  disabled,
}: {
  form: UseFormReturn<FacilityFormInput, unknown, FacilityFormValues>;
  farms: readonly FarmOption[];
  // La finca del elemento que se edita.
  fixedFarm?: { code?: string | null; name: string };
  error?: string;
  disabled: boolean;
}) {
  const farmId = form.watch('farm_id');
  const only = farms.length === 1 ? farms[0] : undefined;
  const fixed = fixedFarm ?? only;

  if (fixed) {
    return (
      <div>
        <p className="font-bold text-selva">Finca</p>
        <p>{farmLabel(fixed)}</p>
        {fixedFarm && (
          <p className="text-sm text-muted-foreground">
            La finca no se cambia: un cajón o una marquesina están construidos
            en ella.
          </p>
        )}
        {error && <InlineError>{error}</InlineError>}
      </div>
    );
  }

  const options = farms.map((farm) => ({
    id: farm.id,
    label: farmLabel(farm),
  }));
  return (
    <SearchSelect
      disabled={disabled}
      error={error}
      label="Finca"
      onChange={(option) =>
        form.setValue('farm_id', option?.id ?? '', {
          shouldValidate: form.formState.isSubmitted,
        })
      }
      options={options}
      placeholder="Elige una finca"
      value={options.find((option) => option.id === farmId) ?? null}
    />
  );
}
