import { useQuery } from '@tanstack/react-query';

import type { ProducerRef } from '@/lib/format/producer';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];

// Una parcela para elegirla en un formulario de otro dominio, con la finca (y su productor) a la
// que pertenece: elegirla deja dicha su finca.
export type PlotOption = {
  id: string;
  code: string;
  name: string | null;
  areaHectares: string;
  isActive: boolean;
  farm: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    producer: ProducerRef;
  };
};

export type PlotOptionsFilter = { farm?: string; producer?: string };

// El tope de una página de la API. Una lista que no cabe se acota con la finca o el productor.
export const PLOT_OPTIONS_SIZE = 100;

export async function fetchPlotOptions(
  { farm, producer }: PlotOptionsFilter,
  signal?: AbortSignal,
): Promise<{ options: PlotOption[]; count: number }> {
  const params = new URLSearchParams({
    is_active: 'true',
    // Agrupadas por productor y finca, para que el tope corte entre grupos y no a mitad de uno.
    ordering: 'producer,farm,code',
    page_size: String(PLOT_OPTIONS_SIZE),
  });
  if (farm) params.set('farm', farm);
  if (producer) params.set('producer', producer);
  const page = await apiFetch<Schemas['PaginatedPlotList']>(
    `/api/plots?${params}`,
    { signal },
  );
  return {
    options: page.results.map((plot) => ({
      id: plot.id,
      code: plot.code,
      name: plot.name ?? null,
      areaHectares: plot.area_hectares,
      isActive: plot.is_active,
      farm: {
        id: plot.farm.id,
        code: plot.farm.code,
        name: plot.farm.name,
        isActive: plot.farm.is_active,
        producer: plot.farm.producer,
      },
    })),
    count: page.count,
  };
}

// Las parcelas activas, de una finca, de un productor o de todas las que alcanza quien pregunta
// (hasta el tope). Solo con conexión: las piden formularios que también la necesitan. Vive aquí y
// no en el dominio de parcelas porque la piden otros dominios.
export const usePlotOptions = (
  filter: PlotOptionsFilter,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.plots.options(filter.farm ?? '', filter.producer ?? ''),
    queryFn: ({ signal }) => fetchPlotOptions(filter, signal),
    enabled,
  });
