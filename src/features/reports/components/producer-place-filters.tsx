'use client';

import { useState } from 'react';

import { chosenOption } from '@/components/chosen-option';
import { FarmFilter } from '@/components/farm-filter';
import { ProducerFilter } from '@/components/producer-filter';
import { SearchSelect } from '@/components/search-select';
import { useLotSearch } from '@/lib/api/lot-options';
import { usePlotOptions } from '@/lib/api/plot-options';
import { plotLabel } from '@/lib/format/place-label';

import type { ReportsScreenState } from '../use-reports-screen';

// Dónde se mira la unidad productiva: el productor (solo la cuenta técnica), la finca, una parcela
// de ella y un lote, cada uno acotado por el anterior.
export function ProducerPlaceFilters({
  screen,
}: {
  screen: ReportsScreenState;
}) {
  const { filters, superuser } = screen;
  const { values } = filters;
  const producer = superuser ? (values.producer ?? undefined) : undefined;
  const [lotSearch, setLotSearch] = useState('');
  const plots = usePlotOptions({ farm: values.farm ?? undefined, producer });
  const lots = useLotSearch(
    {
      search: lotSearch,
      farm: values.farm,
      plot: values.plot,
      producer: producer ?? null,
    },
    { enabled: screen.canFilterLot },
  );

  // Sin finca elegida, las parcelas se agrupan por la suya.
  const plotOptions = (plots.data?.options ?? []).map((plot) => ({
    id: plot.id,
    label: plotLabel(plot),
    group: values.farm ? undefined : `${plot.farm.code} · ${plot.farm.name}`,
  }));
  const lotOptions = (lots.data ?? []).map(({ id, code }) => ({
    id,
    label: code,
  }));

  return (
    <>
      {superuser && (
        <ProducerFilter
          className="w-full sm:w-60"
          compact
          onClear={() => void filters.setProducer(null)}
          onSelect={(id) => void filters.setProducer(id)}
          placeholder="Buscar productor"
          producer={values.producer ?? undefined}
          selected={screen.selectedProducer}
        />
      )}
      <FarmFilter
        className="w-full sm:w-56"
        compact
        farm={values.farm ?? undefined}
        hideLabel
        onClear={() => void filters.setFarm(null)}
        onSelect={(farm) => void filters.setFarm(farm.id)}
        producer={producer}
        selectedLabel="Finca elegida"
      />
      <SearchSelect
        allLabel="Todas las parcelas"
        className="w-full sm:w-52"
        compact
        label="Parcela"
        onChange={(option) => void filters.setPlot(option?.id ?? null)}
        options={plotOptions}
        value={chosenOption(values.plot, plotOptions, 'Parcela elegida')}
      />
      {screen.canFilterLot && (
        <SearchSelect
          allLabel="Todos los lotes"
          className="w-full sm:w-56"
          compact
          label="Lote"
          onChange={(option) => void filters.setLot(option?.id ?? null)}
          onSearch={setLotSearch}
          options={lotOptions}
          placeholder="Buscar lote"
          value={chosenOption(values.lot, lotOptions, 'Lote elegido')}
        />
      )}
    </>
  );
}
