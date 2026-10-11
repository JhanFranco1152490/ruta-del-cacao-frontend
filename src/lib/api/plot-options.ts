import { useQuery } from '@tanstack/react-query';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];

// Una parcela para elegirla en un formulario de otro dominio.
export type PlotOption = {
  id: string;
  code: string;
  areaHectares: string;
  isActive: boolean;
};

// El tope de una página de la API: una finca con más parcelas que esto no es realista.
const PLOT_OPTIONS_SIZE = 100;

export async function fetchPlotOptions(
  farmId: string,
  signal?: AbortSignal,
): Promise<PlotOption[]> {
  const params = new URLSearchParams({
    farm: farmId,
    page_size: String(PLOT_OPTIONS_SIZE),
  });
  const page = await apiFetch<Schemas['PaginatedPlotList']>(
    `/api/plots?${params}`,
    { signal },
  );
  return page.results.map((plot) => ({
    id: plot.id,
    code: plot.code,
    areaHectares: plot.area_hectares,
    isActive: plot.is_active,
  }));
}

// Las parcelas de una finca, solo con conexión: las piden formularios que también la necesitan.
// Vive aquí y no en el dominio de parcelas porque la piden otros dominios.
export const usePlotOptions = (farmId: string) =>
  useQuery({
    queryKey: queryKeys.plots.options(farmId),
    queryFn: ({ signal }) => fetchPlotOptions(farmId, signal),
    enabled: !!farmId,
  });
