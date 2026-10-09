'use client';

import { cn } from 'cn';
import { useEffect, useId, useState } from 'react';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { getErrorMessage } from '@/lib/api/errors';
import { type FarmOption, useFarmSearch } from '@/lib/api/farm-options';
import { producerLabelOf } from '@/lib/format/producer';

const SEARCH_DELAY_MS = 300;

// De qué finca ver los registros. Un solo campo busca y elige, como el filtro de productor: se
// escribe parte del nombre y se elige de lo que trae el servidor, así que sirve igual con tres
// fincas que con cien. Quien ve las de varios productores lee de quién es cada una, y elegir una
// deja dicho su productor (lo recibe `onSelect`).
export function FarmFilter({
  farm,
  selectedLabel,
  producer,
  showProducer = false,
  onSelect,
  onClear,
  label = 'Finca',
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
  className?: string;
}) {
  const inputId = useId();
  const [typed, setTyped] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch((typed ?? '').trim()),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [typed]);
  const options = useFarmSearch(search, producer);
  const results = options.data?.options ?? [];
  const labelOf = (option: FarmOption) =>
    showProducer
      ? `${option.name} · ${option.municipality} · ${producerLabelOf(option.producer)}`
      : `${option.name} · ${option.municipality}`;
  const selectedInResults = results.find((option) => option.id === farm);
  const selectedItem: FarmOption | null = farm
    ? (selectedInResults ?? {
        id: farm,
        name: selectedLabel ?? '',
        isActive: true,
        municipality: '',
        producer: { id: '', member_code: '', first_name: '', last_name: '' },
      })
    : null;
  const items =
    selectedItem && !selectedInResults ? [selectedItem, ...results] : results;
  const emptyMessage = options.isError
    ? getErrorMessage(options.error, 'No fue posible cargar las fincas.')
    : options.isPending
      ? 'Cargando fincas…'
      : 'Ninguna finca coincide con la búsqueda.';

  return (
    <div className={cn('space-y-2', className)}>
      <label
        className="mb-2 block text-sm font-bold text-selva"
        htmlFor={inputId}
      >
        {label}
      </label>
      <Combobox<FarmOption>
        filter={null}
        inputValue={
          typed ??
          (selectedItem?.municipality
            ? labelOf(selectedItem)
            : (selectedItem?.name ?? ''))
        }
        isItemEqualToValue={(a, b) => a.id === b.id}
        itemToStringLabel={labelOf}
        items={items}
        onInputValueChange={(value, details) =>
          setTyped(details.reason === 'input-change' ? value : null)
        }
        onValueChange={(item) => {
          if (item) onSelect(item);
          else onClear();
        }}
        value={selectedItem}
      >
        <ComboboxInput
          className="h-11 w-full"
          id={inputId}
          placeholder="Nombre de la finca"
          showClear
          showTrigger={false}
        />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(item: FarmOption) => (
              <ComboboxItem key={item.id} value={item}>
                {labelOf(item)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
