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
// dice quien usa el componente (cuentas de empleados, roles propios...) con la etiqueta y el
// texto de ayuda de cada pantalla. Un solo campo busca y elige: `filter={null}` porque los
// resultados ya vienen filtrados por el servidor, no hace falta que el combobox también los
// filtre en el navegador.
export function ProducerFilter({
  producer,
  selected,
  onSelect,
  onClear,
  label = 'Productor',
  placeholder = 'Nombre, documento o código de socio',
  showTrigger = true,
  compact = false,
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
  // Para el encabezado: la etiqueta solo la lee el lector de pantalla y el aviso de "se muestran N
  // productores" va dentro de la lista desplegada, no debajo del campo.
  compact?: boolean;
  // Para encajar en la fila de filtros de quien lo use, junto a otros campos.
  className?: string;
}) {
  const inputId = useId();
  const helpId = `${inputId}-help`;
  // Lo que la persona está escribiendo; `null` mientras no escribe: el campo muestra entonces el
  // productor elegido, también cuando viene ya elegido de antes (al recargar, de la URL).
  const [typed, setTyped] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch((typed ?? '').trim()),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [typed]);
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
          className={cn(
            'text-sm font-bold text-selva',
            compact ? 'sr-only' : 'mb-2 block',
          )}
        >
          {label}
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
          inputValue={
            typed ?? (selectedItem?.member_code ? labelOf(selectedItem) : '')
          }
          onInputValueChange={(value, details) =>
            setTyped(details.reason === 'input-change' ? value : null)
          }
        >
          <ComboboxInput
            id={inputId}
            // Los controles de oficina del sistema de diseño miden 44 px (h-11); el combobox
            // trae 32 px por defecto (h-8).
            className="h-11 w-full"
            placeholder={placeholder}
            showClear
            showTrigger={showTrigger}
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
            {compact && paginationHint && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {paginationHint}
              </p>
            )}
          </ComboboxContent>
        </Combobox>
        {!compact && paginationHint && (
          <p id={helpId} className="mt-2 text-sm text-muted-foreground">
            {paginationHint}
          </p>
        )}
      </div>
    </div>
  );
}
