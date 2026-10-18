'use client';

import { useMemo } from 'react';

import type { SearchSelectOption } from '@/components/search-select';
import { useSession } from '@/hooks/use-session';
import { useFarmOptions } from '@/lib/api/farm-options';
import { usePlot } from '@/lib/api/plot-read';
import { usePlotOptions } from '@/lib/api/plot-options';

import { useActivePestsDiseases } from './pest-api';

// Lo que ofrecen los filtros del historial: las fincas, las parcelas (de la finca elegida, si hay
// una) y las plagas del catálogo. Las fincas y las plagas tienen copia en el dispositivo; las
// parcelas no, así que sin conexión la elegida se nombra con su propia lectura guardada.
export function useHistoryChoices({
  producer,
  farm,
  plot,
}: {
  producer: string | null;
  farm: string | null;
  plot: string | null;
}) {
  const { data: user } = useSession();
  const farms = useFarmOptions(user?.id, producer ?? undefined);
  const plots = usePlotOptions({
    farm: farm ?? undefined,
    producer: producer ?? undefined,
  });
  const chosenPlot = usePlot(user?.id, plot ?? '');
  const pests = useActivePestsDiseases(user?.id);

  const farmOptions = useMemo<SearchSelectOption[]>(
    () =>
      (farms.data?.data.options ?? []).map(({ id, name }) => ({
        id,
        label: name,
      })),
    [farms.data],
  );
  const plotOptions = useMemo<SearchSelectOption[]>(
    () =>
      (plots.data?.options ?? []).map((option) => ({
        id: option.id,
        label: option.code,
        group: option.farm.name,
      })),
    [plots.data],
  );

  return {
    farmOptions,
    plotOptions,
    pests: pests.data?.data,
    // Cómo se llama lo elegido cuando todavía no está entre las opciones.
    farmName: (id: string) =>
      farmOptions.find((option) => option.id === id)?.label ?? 'Finca elegida',
    plotCode: (id: string) =>
      plotOptions.find((option) => option.id === id)?.label ??
      chosenPlot.data?.data.code ??
      'Parcela elegida',
  };
}
