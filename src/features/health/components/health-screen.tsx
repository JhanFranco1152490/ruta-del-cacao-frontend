'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/error-state';
import { PageHeader } from '@/components/page-header';
import {
  SearchSelect,
  type SearchSelectOption,
} from '@/components/search-select';
import { buttonVariants } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { usePlotOptions } from '@/lib/api/plot-options';
import { producerLabelOf } from '@/lib/format/producer';

import { plotHistoryPath } from '../health-paths';

// La entrada de sanidad desde la barra lateral: se elige la parcela, agrupada por su finca, y se
// abre su historial fitosanitario. También se llega desde la tarjeta de cada parcela.
export function HealthScreen() {
  const { data: user } = useSession();
  const plots = usePlotOptions({});
  const [chosen, setChosen] = useState<SearchSelectOption | null>(null);
  const showProducer = user?.is_superuser === true;
  const options = useMemo<SearchSelectOption[]>(
    () =>
      (plots.data?.options ?? []).map((plot) => ({
        id: plot.id,
        label: plot.code,
        group: showProducer
          ? `${plot.farm.name} · ${producerLabelOf(plot.farm.producer)}`
          : plot.farm.name,
      })),
    [plots.data, showProducer],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">
      <PageHeader
        description="El historial de monitoreos de una parcela: cómo evoluciona cada plaga y qué se hizo con ella."
        eyebrow="Sanidad de la parcela"
        title="Sanidad"
      />
      <section className="mt-8 space-y-4 rounded-lg bg-card p-5 shadow-card">
        {plots.isError ? (
          <ErrorState
            message="No fue posible cargar las parcelas."
            onRetry={() => void plots.refetch()}
          />
        ) : (
          <SearchSelect
            disabled={plots.isPending}
            emptyMessage="Ninguna parcela coincide."
            label="Parcela"
            onChange={setChosen}
            options={options}
            placeholder={
              plots.isPending
                ? 'Cargando parcelas…'
                : 'Escribe la finca o el código'
            }
            value={chosen}
          />
        )}
        {chosen && (
          <Link
            className={buttonVariants({ size: 'office' })}
            href={plotHistoryPath(chosen.id)}
          >
            Ver historial fitosanitario
          </Link>
        )}
      </section>
    </div>
  );
}
