'use client';

import { useMemo } from 'react';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';

import { OTHER_PEST_DISEASE } from '../monitoring-rules';
import type { PestDisease } from '../pest-api';

const OTHER_OPTION: SearchSelectOption = {
  id: OTHER_PEST_DISEASE,
  label: 'Otra',
  description: 'Lo que no está en la lista: escribes qué encontraste.',
  pinned: true,
};

// Las plagas y enfermedades activas, cada una con su descripción debajo para reconocerla aunque no
// se recuerde el nombre, y al final siempre Otra. Una que ya no está activa (llegó así de una
// corrección) sigue mostrándose mientras esté elegida, para poder cambiarla.
export function PestPicker({
  pests,
  value,
  onChange,
  onBlur,
  error,
  disabled,
}: {
  pests: readonly PestDisease[] | undefined;
  // El id elegido, `OTHER_PEST_DISEASE` o vacío.
  value: string;
  onChange: (id: string) => void;
  onBlur: () => void;
  error?: string;
  disabled: boolean;
}) {
  const options = useMemo<SearchSelectOption[]>(
    () => [
      ...(pests ?? []).map((pest) => ({
        id: pest.id,
        label: pest.name,
        description: pest.description,
      })),
      OTHER_OPTION,
    ],
    [pests],
  );
  const selected =
    options.find((option) => option.id === value) ??
    (value ? { id: value, label: 'Ya no está activa' } : null);

  return (
    <SearchSelect
      disabled={disabled}
      emptyMessage="Ninguna coincide. Elige Otra y escribe qué encontraste."
      error={error}
      hint={selected?.description}
      inputClassName={CAPTURE_FIELD_CLASS}
      label="Plaga o enfermedad"
      onBlur={onBlur}
      onChange={(option) => onChange(option?.id ?? '')}
      options={options}
      placeholder="Escribe para buscar"
      value={selected}
    />
  );
}
