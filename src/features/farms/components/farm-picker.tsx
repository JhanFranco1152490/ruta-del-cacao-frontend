'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ProducerFilter } from '@/components/producer-filter';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { getErrorMessage } from '@/lib/api/errors';
import { useProducerSummary } from '@/lib/api/producer-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { type Farm, useFarms } from '../api';
import { producerLabelOf } from '../farm-list-item';

const SEARCH_DELAY_MS = 300;

const labelOf = (farm: Farm) =>
  `${farm.name} · ${farm.municipality.name} · ${producerLabelOf(farm.producer)}`;

// Para registrar una parcela sin pasar antes por la lista de fincas: se busca la finca por
// nombre y se entrega la elegida. Cada opción dice de qué productor es, porque dos productores
// pueden tener fincas con el mismo nombre; quien no tiene un productor propio puede además acotar
// la búsqueda a uno.
export function FarmPicker({ onPick }: { onPick: (farmId: string) => void }) {
  const inputId = useId();
  const { data: user } = useSession();
  const canFilterByProducer =
    !user?.producer_id && hasPermission(user, PERMISSIONS.PRODUCERS_VIEW);
  const [producer, setProducer] = useState<string>();
  const selectedProducer = useProducerSummary(producer);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [input]);
  const farms = useFarms({ search: search || undefined, producer });
  const results = farms.data?.results ?? [];
  const more = (farms.data?.count ?? 0) - results.length;
  // Sin nada escrito y sin ninguna finca: no hay qué buscar, y lo que sigue es crear una.
  const noFarmsYet =
    farms.isSuccess && farms.data.count === 0 && !search && !input.trim();
  const canAddFarm = hasPermission(user, PERMISSIONS.FARMS_ADD);
  const empty = farms.isError
    ? getErrorMessage(farms.error, 'No fue posible cargar las fincas.')
    : farms.isPending
      ? 'Cargando fincas…'
      : 'Ninguna finca coincide con la búsqueda.';

  return (
    <div className="space-y-5">
      {canFilterByProducer && (
        <ProducerFilter
          onClear={() => setProducer(undefined)}
          onSelect={setProducer}
          producer={producer}
          selected={selectedProducer}
        />
      )}
      {noFarmsYet ? (
        <EmptyState
          title={
            producer
              ? 'Este productor aún no tiene fincas'
              : 'Aún no hay ninguna finca'
          }
          description={
            canAddFarm
              ? 'Una parcela se registra dentro de una finca: crea la finca primero y vuelve aquí.'
              : 'Una parcela se registra dentro de una finca, y la finca debe registrarla antes quien la administra.'
          }
          action={
            canAddFarm && (
              <Link
                className={buttonVariants({ size: 'office' })}
                href="/fincas/nueva"
              >
                Registrar una finca
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          <label
            htmlFor={inputId}
            className="block text-sm font-bold text-selva"
          >
            Finca
          </label>
          <Combobox<Farm>
            items={results}
            filter={null}
            value={null}
            onValueChange={(farm) => {
              if (farm) onPick(farm.id);
            }}
            isItemEqualToValue={(a, b) => a.id === b.id}
            itemToStringLabel={labelOf}
            inputValue={input}
            onInputValueChange={setInput}
          >
            <ComboboxInput
              id={inputId}
              className="h-11 w-full"
              placeholder="Nombre de la finca"
            />
            <ComboboxContent>
              <ComboboxEmpty>{empty}</ComboboxEmpty>
              <ComboboxList>
                {(farm: Farm) => (
                  <ComboboxItem key={farm.id} value={farm}>
                    {labelOf(farm)}
                  </ComboboxItem>
                )}
              </ComboboxList>
              {more > 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Se muestran {results.length} fincas; escribe para encontrar
                  otras.
                </p>
              )}
            </ComboboxContent>
          </Combobox>
        </div>
      )}
    </div>
  );
}
