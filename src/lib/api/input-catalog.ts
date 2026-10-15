import { useQuery } from '@tanstack/react-query';

import { readThroughCache } from '@/lib/offline/cached-read';

import { apiFetch } from './client';
import { queryKeys } from './query-keys';
import type { components } from './schema';

type Schemas = components['schemas'];
export type AgriculturalInput = Schemas['AgriculturalInput'];
export type InputStock = Schemas['InputStock'];

// El catálogo de insumos y las existencias de una finca. Viven aquí y no en el dominio de insumos
// porque los leen otros dominios: quien registra una labor elige de ese catálogo.

// El catálogo no se pagina: búsqueda y filtros corren en el dispositivo, también sin conexión.
// `producer` solo lo envía la cuenta técnica; las demás cuentas leen el catálogo de su productor.
export async function fetchAgriculturalInputs(
  { producer, farm }: { producer: string | null; farm?: string },
  signal?: AbortSignal,
): Promise<AgriculturalInput[]> {
  const params = new URLSearchParams();
  if (producer) params.set('producer', producer);
  if (farm) params.set('farm', farm);
  const suffix = params.size ? `?${params}` : '';
  const { results } = await apiFetch<Schemas['AgriculturalInputList']>(
    `/api/agricultural-inputs${suffix}`,
    { signal },
  );
  return results;
}

// Con copia en el dispositivo, para consultar el catálogo y elegir insumos sin conexión.
export const useAgriculturalInputs = (
  userId: string | undefined,
  producer: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.agriculturalInputs.list(producer),
    queryFn: ({ signal }) =>
      readThroughCache(
        userId!,
        producer
          ? `agricultural-inputs:producer:${producer}`
          : 'agricultural-inputs',
        () => fetchAgriculturalInputs({ producer }, signal),
      ),
    enabled: enabled && !!userId,
    networkMode: 'offlineFirst',
  });

// Los insumos que están en una finca, con copia en el dispositivo. Un empleado que trabaja en
// varias fincas registra una labor con lo que hay en la finca de la parcela, no con lo de todas.
export const useFarmInputs = (
  userId: string | undefined,
  farmId: string | null,
  { enabled = true } = {},
) =>
  useQuery({
    queryKey: queryKeys.agriculturalInputs.farm(farmId ?? ''),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `agricultural-inputs:farm:${farmId}`, () =>
        fetchAgriculturalInputs({ producer: null, farm: farmId! }, signal),
      ),
    enabled: enabled && !!userId && !!farmId,
    networkMode: 'offlineFirst',
  });

// Solo vienen los insumos con movimientos: los demás no tienen existencias. Con `farm`, las de esa
// finca; sin ella, una fila por insumo y finca de todo el alcance, para sumar el total. `producer`
// solo lo usa la cuenta técnica.
export async function fetchInputStocks(
  { farm, producer }: { farm: string | null; producer: string | null },
  signal?: AbortSignal,
): Promise<InputStock[]> {
  const params = new URLSearchParams();
  if (farm) params.set('farm', farm);
  if (producer) params.set('producer', producer);
  const suffix = params.size ? `?${params}` : '';
  const { results } = await apiFetch<Schemas['InputStockList']>(
    `/api/input-stocks${suffix}`,
    { signal },
  );
  return results;
}

export const useInputStocks = (
  userId: string | undefined,
  farmId: string | null,
) =>
  useQuery({
    queryKey: queryKeys.inputStocks.byFarm(farmId ?? ''),
    queryFn: ({ signal }) =>
      readThroughCache(userId!, `input-stocks:farm:${farmId}`, () =>
        fetchInputStocks({ farm: farmId, producer: null }, signal),
      ),
    enabled: !!userId && !!farmId,
    networkMode: 'offlineFirst',
  });
