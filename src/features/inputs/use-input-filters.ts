'use client';

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs';

import {
  INPUT_TYPE_OPTIONS,
  type InputFilters,
  type InputStatusFilter,
  type InputType,
} from './input-options';

const TYPES = INPUT_TYPE_OPTIONS.map((option) => option.value);
const STATUSES = [
  'active',
  'inactive',
  'all',
] as const satisfies readonly InputStatusFilter[];

// Los filtros viven en la URL: se pueden compartir y el botón atrás los respeta. Los valores
// malformados (?tipo=zzz, ?estado=zzz) caen al valor por defecto en vez de romper la lista. La
// lista se filtra en el dispositivo, así que no hay páginas ni espera mientras se escribe.
const parsers = {
  search: parseAsString.withDefault(''),
  type: parseAsStringLiteral(TYPES),
  status: parseAsStringLiteral(STATUSES).withDefault('active'),
  producer: parseAsString,
  farm: parseAsString,
};

// En la URL los parámetros van en español, como las rutas.
const urlKeys = {
  search: 'buscar',
  type: 'tipo',
  status: 'estado',
  producer: 'productor',
  farm: 'finca',
};

export function useInputFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });

  const filters: InputFilters = {
    search: params.search,
    type: params.type ?? '',
    status: params.status,
  };

  return {
    filters,
    // `?productor=` vacío es "sin filtro"; solo lo usa la cuenta técnica.
    producer: params.producer || null,
    setSearch: (search: string) => setParams({ search: search || null }),
    setType: (type: InputType | '') => setParams({ type: type || null }),
    setStatus: (status: InputStatusFilter) => setParams({ status }),
    // La finca elegida era de otro productor: al cambiarlo, se vuelve a elegir.
    setProducer: (producer: string | null) =>
      setParams({ producer, farm: null }),
    // `?finca=` vacío es "sin elegir": las existencias se muestran de una finca.
    farm: params.farm || null,
    setFarm: (farm: string | null) => setParams({ farm }),
    // El productor y la finca no son filtros sino de qué catálogo y qué bodega se trata: se
    // conservan.
    clear: () => setParams({ search: null, type: null, status: null }),
    // Lleva la lista a un insumo que ya existe (por ejemplo, el que tiene el nombre repetido),
    // esté activo o no.
    showInput: ({
      name,
      input_type,
    }: {
      name: string;
      input_type: InputType;
    }) => setParams({ search: name, type: input_type, status: 'all' }),
  };
}
