'use client';

import { FarmFilter } from '@/components/farm-filter';
import { MunicipalityFilter } from '@/components/municipality-filter';
import { ProducerFilter } from '@/components/producer-filter';
import { useMunicipalities } from '@/lib/api/municipalities';

import type { ReportsScreenState } from '../use-reports-screen';

// Dónde se mira la asociación: el municipio, el productor vinculado y una de sus fincas. Nada por
// parcela ni por lote: el reporte es por finca.
export function AssociationPlaceFilters({
  screen,
}: {
  screen: ReportsScreenState;
}) {
  const { filters } = screen;
  const { values } = filters;
  const municipalities = useMunicipalities();

  return (
    <>
      <MunicipalityFilter
        className="w-full sm:w-52"
        hideLabel
        label="Municipio"
        municipalities={municipalities.data ?? []}
        onChange={(code) => void filters.setMunicipality(code)}
        value={values.municipality}
      />
      <ProducerFilter
        className="w-full sm:w-60"
        compact
        onClear={() => void filters.setProducer(null)}
        onSelect={(id) => void filters.setProducer(id)}
        placeholder="Buscar productor"
        producer={values.producer ?? undefined}
        selected={screen.selectedProducer}
      />
      <FarmFilter
        className="w-full sm:w-56"
        compact
        farm={values.farm ?? undefined}
        hideLabel
        onClear={() => void filters.setFarm(null)}
        onSelect={(farm) => void filters.setFarm(farm.id)}
        producer={values.producer ?? undefined}
        selectedLabel="Finca elegida"
        showProducer={!values.producer}
      />
    </>
  );
}
