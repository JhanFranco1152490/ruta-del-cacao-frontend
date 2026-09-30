'use client';
import { useEffect, useId, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { cn } from 'cn';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { getErrorMessage } from '@/lib/api/errors';
import {
  useProducerOptions,
  type ProducerSummary,
} from '@/lib/api/producer-options';

const SEARCH_DELAY_MS = 300;
const DEFAULT_DENIED_MESSAGE =
  'Este productor no ha autorizado el acceso de la asociación: no puedes ver ni crear las cuentas de sus empleados.';

type ProducerOption = {
  id: string;
  first_name: string;
  last_name: string;
  member_code: string;
};

function labelOf(item: ProducerOption): string {
  return `${item.first_name} ${item.last_name} · ${item.member_code}`;
}

// Con qué productor trabaja la asociación en esta pantalla: qué significa "elegir uno" lo
// dice quien usa el componente (cuentas de empleados, roles propios...) vía los textos. Un
// solo campo busca y elige: `filter={null}` porque los resultados ya vienen filtrados por el
// servidor, no hace falta que el combobox también los filtre en el navegador.
export function ProducerFilter({
  producer,
  selected,
  onSelect,
  onClear,
  deniedMessage = DEFAULT_DENIED_MESSAGE,
  className,
}: {
  producer: string | undefined;
  selected: UseQueryResult<ProducerSummary>;
  onSelect: (id: string) => void;
  onClear: () => void;
  deniedMessage?: string;
  // Para encajar en la fila de filtros de quien lo use, junto a otros campos.
  className?: string;
}) {
  const inputId = useId();
  const helpId = `${inputId}-help`;
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input]);
  const options = useProducerOptions(search);
  const results = options.data?.results ?? [];
  const more = (options.data?.count ?? 0) - results.length;
  // El elegido puede no estar entre los resultados de la búsqueda actual: se agrega aparte
  // para que el combobox lo siga mostrando como valor mientras sigue elegido.
  const selectedInResults = results.find((option) => option.id === producer);
  const selectedItem: ProducerOption | null = producer
    ? (selectedInResults ??
      (selected.data
        ? {
            id: producer,
            first_name: selected.data.first_name,
            last_name: selected.data.last_name,
            member_code: selected.data.member_code,
          }
        : { id: producer, first_name: '', last_name: '', member_code: '' }))
    : null;
  const items =
    selectedItem && !selectedInResults ? [selectedItem, ...results] : results;
  const emptyMessage = options.isError
    ? getErrorMessage(options.error, 'No fue posible cargar los productores.')
    : options.isPending
      ? 'Cargando productores…'
      : 'Ningún productor coincide con la búsqueda.';
  const paginationHint =
    !options.isPending && !options.isError && results.length && more > 0
      ? `Se muestran ${results.length} productores; escribe para encontrar otros.`
      : undefined;
  return (
    <div className={cn('space-y-2', className)}>
      <div>
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-bold text-selva"
        >
          Productor
        </label>
        <Combobox<ProducerOption>
          items={items}
          filter={null}
          value={selectedItem}
          onValueChange={(item) => {
            if (item) onSelect(item.id);
            else onClear();
          }}
          isItemEqualToValue={(a, b) => a.id === b.id}
          itemToStringLabel={labelOf}
          inputValue={input}
          onInputValueChange={setInput}
        >
          <ComboboxInput
            id={inputId}
            // Los controles de oficina del sistema de diseño miden 44 px (h-11); el combobox
            // trae 32 px por defecto (h-8).
            className="h-11 w-full"
            placeholder="Nombre, documento o código de socio"
            showClear
            aria-describedby={helpId}
          />
          <ComboboxContent>
            <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
            <ComboboxList>
              {(item: ProducerOption) => (
                <ComboboxItem key={item.id} value={item}>
                  {labelOf(item)}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {paginationHint && (
          <p id={helpId} className="mt-2 text-sm text-muted-foreground">
            {paginationHint}
          </p>
        )}
      </div>
      {selected.data?.association_access === false && (
        <p role="alert" className="text-sm font-bold text-err">
          {deniedMessage}
        </p>
      )}
    </div>
  );
}
