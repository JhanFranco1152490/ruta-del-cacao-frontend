'use client';

import { useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';

import { SearchSelect } from '@/components/search-select';
import { getErrorMessage } from '@/lib/api/errors';
import {
  useProducerOptions,
  type ProducerSummary,
} from '@/lib/api/producer-options';

const labelOf = (item: {
  first_name: string;
  last_name: string;
  member_code: string;
}) => `${item.first_name} ${item.last_name} · ${item.member_code}`;

// Con qué productor trabaja la asociación en esta pantalla: qué significa "elegir uno" lo
// dice quien usa el componente (cuentas de empleados, roles propios...) con la etiqueta y el
// texto de ayuda de cada pantalla. Un solo campo busca y elige; los resultados vienen ya filtrados
// por el servidor.
export function ProducerFilter({
  producer,
  selected,
  onSelect,
  onClear,
  label = 'Productor',
  placeholder = 'Nombre, documento o código de socio',
  showTrigger = true,
  compact = false,
  hideLabel = false,
  className,
}: {
  producer: string | undefined;
  selected: UseQueryResult<ProducerSummary>;
  onSelect: (id: string) => void;
  onClear: () => void;
  label?: string;
  placeholder?: string;
  // Sin la flecha se lee como un campo para escribir y no como una lista cerrada.
  showTrigger?: boolean;
  // Para una fila de filtros compactos: mismo tamaño que los demás y la etiqueta solo para lectores
  // de pantalla, así que el texto de ayuda debe decir qué se busca.
  compact?: boolean;
  // Solo la etiqueta para lectores de pantalla, sin cambiar el tamaño.
  hideLabel?: boolean;
  // Para encajar en la fila de filtros de quien lo use, junto a otros campos.
  className?: string;
}) {
  const [search, setSearch] = useState('');
  const found = useProducerOptions(search);
  const results = found.data?.results ?? [];
  const more = (found.data?.count ?? 0) - results.length;
  const options = results.map((option) => ({
    id: option.id,
    label: labelOf(option),
  }));
  // El elegido puede no estar entre los resultados de la búsqueda actual: se muestra igual.
  const chosen = producer
    ? (options.find(({ id }) => id === producer) ?? {
        id: producer,
        label: selected.data ? labelOf(selected.data) : '',
      })
    : null;
  const emptyMessage = found.isError
    ? getErrorMessage(found.error, 'No fue posible cargar los productores.')
    : found.isPending
      ? 'Cargando productores…'
      : 'Ningún productor coincide con la búsqueda.';
  const paginationHint =
    !found.isPending && !found.isError && results.length && more > 0
      ? `Se muestran ${results.length} productores; escribe para encontrar otros.`
      : undefined;

  return (
    <SearchSelect
      className={className}
      compact={compact}
      emptyMessage={emptyMessage}
      hideLabel={hideLabel}
      hint={paginationHint}
      label={label}
      onChange={(option) => {
        if (option) onSelect(option.id);
        else onClear();
      }}
      onSearch={setSearch}
      options={options}
      placeholder={placeholder}
      showTrigger={showTrigger}
      value={chosen}
    />
  );
}
