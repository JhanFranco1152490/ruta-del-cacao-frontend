'use client';

import { useState } from 'react';

import { SearchSelect } from '@/components/search-select';
import { getErrorMessage } from '@/lib/api/errors';
import { type FarmOption, useFarmSearch } from '@/lib/api/farm-options';
import { producerLabelOf } from '@/lib/format/producer';

// De qué finca ver los registros. Un solo campo busca y elige: se escribe parte del nombre y se
// elige de lo que trae el servidor, así que sirve igual con tres fincas que con cien. Quien ve las
// de varios productores lee de quién es cada una, y elegir una deja dicho su productor (lo recibe
// `onSelect`).
export function FarmFilter({
  farm,
  selectedLabel,
  producer,
  showProducer = false,
  onSelect,
  onClear,
  label = 'Finca',
  compact = false,
  className,
}: {
  farm: string | undefined;
  // El nombre de la finca elegida, que puede no estar entre los resultados de la búsqueda.
  selectedLabel?: string;
  // Solo las fincas de este productor.
  producer?: string;
  showProducer?: boolean;
  onSelect: (farm: FarmOption) => void;
  onClear: () => void;
  label?: string;
  // Para una fila de filtros compactos, como en `ProducerFilter`.
  compact?: boolean;
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const found = useFarmSearch(search, producer);
  const results = found.data?.options ?? [];
  const labelOf = (option: FarmOption) =>
    showProducer
      ? `${option.name} · ${option.municipality} · ${producerLabelOf(option.producer)}`
      : `${option.name} · ${option.municipality}`;
  const options = results.map((option) => ({
    id: option.id,
    label: labelOf(option),
  }));
  const selected = farm
    ? (options.find(({ id }) => id === farm) ?? {
        id: farm,
        label: selectedLabel ?? '',
      })
    : null;
  const emptyMessage = found.isError
    ? getErrorMessage(found.error, 'No fue posible cargar las fincas.')
    : found.isPending
      ? 'Cargando fincas…'
      : 'Ninguna finca coincide con la búsqueda.';

  return (
    <SearchSelect
      className={className}
      compact={compact}
      emptyMessage={emptyMessage}
      label={label}
      onChange={(option) => {
        const chosen = results.find(({ id }) => id === option?.id);
        if (chosen) onSelect(chosen);
        else if (!option) onClear();
      }}
      onSearch={setSearch}
      options={options}
      placeholder="Nombre de la finca"
      showTrigger={false}
      value={selected}
    />
  );
}
