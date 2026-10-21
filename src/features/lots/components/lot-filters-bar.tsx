'use client';

import { FilterRow } from '@/components/filter-row';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { useCacaoVarietyCatalog } from '@/lib/api/cacao-varieties';
import { useFarmOptions } from '@/lib/api/farm-options';
import { usePlotOptions } from '@/lib/api/plot-options';
import { farmLabel, plotLabel } from '@/lib/format/place-label';

import type { useLotFilters } from '../use-lot-filters';

// En celular los filtros van en columna bajo «Filtros», a todo el ancho: `basis` en una columna es
// el alto, y daría a cada uno 11 rem de alto. De `sm` en adelante comparten la fila.
const FILTER_WIDTH = 'w-full sm:min-w-40 sm:flex-1 sm:basis-44';

// La opción de un filtro puesto aunque ya no esté entre las ofrecidas (una parcela inactiva).
const chosen = (
  id: string | undefined,
  options: readonly SearchSelectOption[],
  missing: string,
): SearchSelectOption | null =>
  id
    ? (options.find((option) => option.id === id) ?? { id, label: missing })
    : null;

// El buscador por código va siempre a la vista; finca, parcela y variedad, en celular, tras
// «Filtros». El periodo, de uso menos frecuente, va tras «Más filtros» con sus etiquetas a la
// vista: dos fechas sin etiqueta no dicen cuál es el inicio. Las opciones son las fincas y parcelas que la cuenta alcanza, del productor
// elegido si es la cuenta técnica.
export function LotFiltersBar({
  state,
}: {
  state: ReturnType<typeof useLotFilters>;
}) {
  const { data: user } = useSession();
  const { query } = state;
  const farms = useFarmOptions(user?.id, query.producer);
  const plots = usePlotOptions({ farm: query.farm, producer: query.producer });
  const varieties = useCacaoVarietyCatalog();
  const periodCount = (query.from ? 1 : 0) + (query.to ? 1 : 0);

  const farmOptions = (farms.data?.data.options ?? []).map((farm) => ({
    id: farm.id,
    label: farmLabel(farm),
  }));
  const plotOptions = (plots.data?.options ?? []).map((plot) => ({
    id: plot.id,
    label: plotLabel(plot),
    description: query.farm ? undefined : farmLabel(plot.farm),
  }));
  const varietyOptions = (varieties.data ?? []).map((variety) => ({
    id: variety.id,
    label: variety.name,
  }));

  return (
    <FilterRow
      compact
      activeCount={state.activeCount - periodCount}
      more={
        <>
          <TextField
            className="h-10 text-sm"
            label="Cosechado desde"
            onChange={(event) => void state.setFrom(event.target.value || null)}
            type="date"
            value={query.from ?? ''}
            wrapperClassName={FILTER_WIDTH}
          />
          <TextField
            className="h-10 text-sm"
            label="Cosechado hasta"
            min={query.from}
            onChange={(event) => void state.setTo(event.target.value || null)}
            type="date"
            value={query.to ?? ''}
            wrapperClassName={FILTER_WIDTH}
          />
        </>
      }
      moreActiveCount={periodCount}
      search={
        <TextField
          className="h-10 text-sm"
          hideLabel
          label="Buscar por código"
          onChange={(event) => state.setSearchInput(event.target.value)}
          placeholder="Código del lote"
          type="search"
          value={state.searchInput}
          wrapperClassName="min-w-0 flex-1 sm:w-80 sm:flex-none"
        />
      }
      trailing={
        state.hasFilters && (
          <Button
            className="h-10"
            onClick={() => void state.clear()}
            size="office"
            variant="ghost"
          >
            Limpiar filtros
          </Button>
        )
      }
    >
      <SearchSelect
        allLabel="Todas las fincas"
        className={FILTER_WIDTH}
        compact
        label="Finca"
        onChange={(option) => void state.setFarm(option?.id ?? null)}
        options={farmOptions}
        value={chosen(query.farm, farmOptions, 'Finca elegida')}
      />
      <SearchSelect
        allLabel="Todas las parcelas"
        className={FILTER_WIDTH}
        compact
        label="Parcela"
        onChange={(option) => void state.setPlot(option?.id ?? null)}
        options={plotOptions}
        value={chosen(query.plot, plotOptions, 'Parcela elegida')}
      />
      <SearchSelect
        allLabel="Todas las variedades"
        className={FILTER_WIDTH}
        compact
        label="Variedad"
        onChange={(option) => void state.setVariety(option?.id ?? null)}
        options={varietyOptions}
        value={chosen(query.variety, varietyOptions, 'Variedad elegida')}
      />
    </FilterRow>
  );
}
