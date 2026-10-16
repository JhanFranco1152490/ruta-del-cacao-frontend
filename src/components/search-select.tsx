'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from 'cn';

import { FormField } from '@/components/form-field';
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from '@/components/ui/combobox';

export type SearchSelectOption = {
  id: string;
  label: string;
  // Las opciones con el mismo `group` se muestran bajo un mismo encabezado, que también se busca.
  group?: string;
  // Una segunda línea más pequeña bajo la opción (el área y las variedades de una parcela).
  detail?: string;
  // Se ve en la lista pero no se puede elegir; `detail` dice por qué.
  disabled?: boolean;
};

type Group = { value: string; items: SearchSelectOption[] };

const ALL_ID = '__all__';
const SEARCH_DELAY_MS = 300;

// Escribir «canas» encuentra «Cañas»: se compara sin tildes ni mayúsculas.
const plain = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Un campo para elegir de una lista que se puede escribir, en lugar del select nativo, para listas
// largas o que crecen (fincas, parcelas, municipios, productores). Al abrirlo se ve la lista
// completa y escribir la acota. Hay dos formas de usarlo:
// - sin `onSearch`, la lista ya está cargada y el campo la filtra en el navegador;
// - con `onSearch`, la lista viene del servidor: el campo avisa lo que se escribió (esperando a que
//   deje de escribir) y no vuelve a filtrar lo que llega.
// Con `allLabel` hay una primera entrada fija que significa «sin filtro» («Todas las fincas»):
// elegirla da `null`, y mientras no hay nada elegido el campo la muestra como texto normal, no como
// una ayuda en gris. Sin ella, quien elige puede quitar la elección con la equis.
export function SearchSelect({
  label,
  options,
  value,
  onChange,
  onBlur,
  allLabel,
  onSearch,
  placeholder,
  emptyMessage = 'Ninguna opción coincide con la búsqueda.',
  hint,
  error,
  disabled = false,
  showTrigger = true,
  compact = false,
  hideLabel = false,
  inputClassName,
  id,
  className,
}: {
  label: string;
  options: readonly SearchSelectOption[];
  // La opción elegida. Puede no estar en `options` (la lista se acotó o llegó de otra búsqueda):
  // se agrega aparte para que el campo la siga mostrando.
  value: SearchSelectOption | null;
  onChange: (option: SearchSelectOption | null) => void;
  // Al salir del campo: los formularios que validan al salir lo necesitan.
  onBlur?: () => void;
  allLabel?: string;
  onSearch?: (text: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  // Sin la flecha se lee como un campo para escribir y no como una lista cerrada.
  showTrigger?: boolean;
  // Para una fila de filtros: 40 px en lugar de 44, texto pequeño y la etiqueta solo para lectores
  // de pantalla (la entrada «Todas…» ya dice a qué se refiere el campo).
  compact?: boolean;
  // Solo la etiqueta para lectores de pantalla, sin cambiar el tamaño.
  hideLabel?: boolean;
  // Se suma al estilo del campo: la densidad de captura en campo, por ejemplo.
  inputClassName?: string;
  id?: string;
  className?: string;
}) {
  // Lo que la persona está escribiendo; `null` mientras no escribe: el campo muestra entonces la
  // opción elegida, también cuando viene ya elegida de antes (de la URL, al recargar).
  const [typed, setTyped] = useState<string | null>(null);
  useEffect(() => {
    if (!onSearch) return;
    const timer = setTimeout(
      () => onSearch((typed ?? '').trim()),
      SEARCH_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [typed, onSearch]);

  // Al enfocar el campo se selecciona su texto para que lo que se escriba lo reemplace: sin esto,
  // escribir se agregaría a «Todas las fincas» o al nombre elegido y la lista quedaría vacía. Con el
  // ratón, soltar el botón después de enfocar mueve el cursor y borra la selección, así que se evita.
  const focusedByMouse = useRef(false);

  const allOption = useMemo<SearchSelectOption | null>(
    () => (allLabel ? { id: ALL_ID, label: allLabel } : null),
    [allLabel],
  );
  const selected = value ?? allOption;
  const rows = useMemo(() => {
    const listed = options.some(({ id: optionId }) => optionId === value?.id)
      ? options
      : value
        ? [value, ...options]
        : options;
    return allOption ? [allOption, ...listed] : listed;
  }, [options, value, allOption]);
  const grouped = rows.some((row) => row.group);
  const items = useMemo<
    readonly SearchSelectOption[] | readonly Group[]
  >(() => {
    if (!grouped) return rows;
    const groups = new Map<string, SearchSelectOption[]>();
    for (const row of rows) {
      const key = row.group ?? '';
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups].map(([group, members]) => ({
      value: group,
      items: members,
    }));
  }, [rows, grouped]);

  const renderItem = (row: SearchSelectOption) => (
    <ComboboxItem disabled={row.disabled} key={row.id} value={row}>
      {row.detail ? (
        <span className="flex flex-col">
          <span>{row.label}</span>
          <span className="text-xs text-muted-foreground">{row.detail}</span>
        </span>
      ) : (
        row.label
      )}
    </ComboboxItem>
  );

  return (
    <FormField
      className={className}
      error={error}
      hideLabel={compact || hideLabel}
      hint={hint}
      id={id}
      label={label}
    >
      {(control) => (
        <Combobox<SearchSelectOption>
          disabled={disabled}
          // Con `typed` en `null` no se filtra: al abrir el campo con algo ya elegido se ve la lista
          // entera y no solo la opción elegida, que es lo que dice su texto.
          filter={
            onSearch
              ? null
              : (row, query) =>
                  typed === null ||
                  plain(`${row.label} ${row.group ?? ''}`).includes(
                    plain(query.trim()),
                  )
          }
          inputValue={typed ?? selected?.label ?? ''}
          isItemEqualToValue={(a, b) => a.id === b.id}
          itemToStringLabel={(row) => row.label}
          items={items}
          onInputValueChange={(text, details) =>
            setTyped(details.reason === 'input-change' ? text : null)
          }
          onValueChange={(row) =>
            onChange(!row || row.id === ALL_ID ? null : row)
          }
          value={selected}
        >
          <ComboboxInput
            {...control}
            // Los controles de oficina del sistema de diseño miden 44 px (h-11); el combobox trae
            // 32 px por defecto (h-8).
            className={cn(
              'w-full',
              compact ? 'h-10 text-sm' : 'h-11',
              inputClassName,
            )}
            disabled={disabled}
            onBlur={onBlur}
            onFocus={(event) => event.currentTarget.select()}
            onMouseDown={(event) => {
              focusedByMouse.current =
                document.activeElement !== event.currentTarget;
            }}
            onMouseUp={(event) => {
              if (!focusedByMouse.current) return;
              focusedByMouse.current = false;
              event.preventDefault();
            }}
            placeholder={placeholder}
            showClear={!allOption}
            showTrigger={showTrigger}
          />
          <ComboboxContent>
            <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
            <ComboboxList>
              {(entry: SearchSelectOption | Group) =>
                'items' in entry ? (
                  <ComboboxGroup items={entry.items} key={entry.value}>
                    {entry.value && (
                      <ComboboxLabel>{entry.value}</ComboboxLabel>
                    )}
                    <ComboboxCollection>{renderItem}</ComboboxCollection>
                  </ComboboxGroup>
                ) : (
                  renderItem(entry)
                )
              }
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}
    </FormField>
  );
}
