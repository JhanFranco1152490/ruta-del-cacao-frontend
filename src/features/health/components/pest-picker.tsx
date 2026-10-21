'use client';

import { useMemo } from 'react';

import { CAPTURE_FIELD_CLASS } from '@/components/capture-field-class';
import { InfoHint } from '@/components/info-hint';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';

import { OTHER_PEST_DISEASE } from '../monitoring-rules';
import type { PestDisease } from '../pest-api';

const OTHER_OPTION: SearchSelectOption = {
  id: OTHER_PEST_DISEASE,
  label: 'Otra',
  info: 'Lo que no está en la lista: escribes qué encontraste.',
  pinned: true,
};

// Las plagas y enfermedades activas, solo con su nombre, y al final siempre Otra. La
// descripción, para reconocerla aunque no se recuerde el nombre, sale en un ícono «i» al poner el
// mouse encima, en cada opción y junto a la etiqueta de la elegida; también se busca. Una que ya no
// está activa (llegó así de una corrección) sigue mostrándose mientras esté elegida, para poder
// cambiarla.
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
        info: pest.description,
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
      // La descripción va en el ícono «i»; para quien no usa el mouse queda aquí, sin verse.
      hint={
        selected?.info ? (
          <span className="sr-only">{selected.info}</span>
        ) : undefined
      }
      inputClassName={CAPTURE_FIELD_CLASS}
      label="Plaga o enfermedad"
      onBlur={onBlur}
      onChange={(option) => onChange(option?.id ?? '')}
      options={options}
      labelAddon={
        selected?.info ? <InfoHint text={selected.info} /> : undefined
      }
      placeholder="Escribe para buscar"
      value={selected}
    />
  );
}
