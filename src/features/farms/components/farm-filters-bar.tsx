'use client';

import { cn } from 'cn';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

import { MunicipalityFilter } from '@/components/municipality-filter';
import { ProducerFilter } from '@/components/producer-filter';
import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import { useMunicipalities } from '@/lib/api/municipalities';
import { useProducerSummary } from '@/lib/api/producer-options';

import type { useFarmFilters } from '../use-farm-filters';

// Arriba de la lista y del mapa: lo que se busca o el municipio que se elige cambia a los dos. Una
// sola fila sin etiquetas visibles (cada campo dice qué es con su texto); en celular queda el
// buscador y un botón «Filtros» que abre el resto, para que la lista llegue antes.
export function FarmFiltersBar({
  filters,
  pickProducer = false,
}: {
  filters: ReturnType<typeof useFarmFilters>;
  // Solo la asociación ve fincas de varios productores y puede quedarse con las de uno.
  pickProducer?: boolean;
}) {
  const municipalities = useMunicipalities();
  const selectedProducer = useProducerSummary(
    pickProducer ? (filters.producer ?? undefined) : undefined,
  );
  const [expanded, setExpanded] = useState(false);
  const active = (filters.municipality ? 1 : 0) + (filters.producer ? 1 : 0);

  return (
    <div className="flex flex-wrap items-start gap-3">
      <TextField
        hideLabel
        label="Buscar finca"
        onChange={(event) => filters.setSearchInput(event.target.value)}
        placeholder="Buscar finca por nombre"
        type="search"
        value={filters.searchInput}
        wrapperClassName="min-w-0 flex-1 sm:w-80 sm:flex-none"
      />
      <Button
        aria-controls="farm-more-filters"
        aria-expanded={expanded}
        className="sm:hidden"
        onClick={() => setExpanded((value) => !value)}
        size="office"
        type="button"
        variant="outline"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" /> Filtros
        {active > 0 && (
          <span className="rounded-full bg-selva px-2 text-xs text-white">
            {active}
          </span>
        )}
      </Button>
      {/* En escritorio los filtros van en la misma fila (`contents`); en celular, bajo el botón. */}
      <div
        className={cn(
          'w-full flex-col gap-3 sm:contents',
          expanded ? 'flex' : 'hidden',
        )}
        id="farm-more-filters"
      >
        <MunicipalityFilter
          className="w-full sm:w-64"
          hideLabel
          municipalities={municipalities.data ?? []}
          onChange={(code) => void filters.setMunicipality(code)}
          value={filters.municipality}
        />
        {pickProducer && (
          <ProducerFilter
            className="w-full sm:w-80"
            hideLabel
            label="Filtrar por productor"
            onClear={() => void filters.setProducer(null)}
            onSelect={(id) => void filters.setProducer(id)}
            placeholder="Productor: nombre, documento o código"
            producer={filters.producer ?? undefined}
            selected={selectedProducer}
            showTrigger={false}
          />
        )}
      </div>
    </div>
  );
}
