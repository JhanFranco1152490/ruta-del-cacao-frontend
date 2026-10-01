import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { isApiError } from './errors';
import { queryKeys } from './query-keys';
import type { components } from './schema';

export type Municipality = components['schemas']['Municipality'];

// Copia del catálogo en el dispositivo: las capturas de campo (fincas) necesitan elegir un
// municipio aunque la app se abra sin señal. Es información pública de referencia, no datos
// personales, así que se conserva entre sesiones.
const CACHE_KEY = 'catalog-municipalities-v1';

function readCachedMunicipalities(): Municipality[] | null {
  try {
    const stored = window.localStorage.getItem(CACHE_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as Municipality[])
      : null;
  } catch {
    // Almacenamiento bloqueado o contenido dañado: como si no hubiera copia.
    return null;
  }
}

function cacheMunicipalities(municipalities: Municipality[]) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(municipalities));
  } catch {
    // Solo se pierde la copia para usar sin conexión.
  }
}

export async function fetchMunicipalities(signal?: AbortSignal) {
  try {
    const { results } = await apiFetch<
      components['schemas']['MunicipalityList']
    >('/api/catalogs/municipalities', { signal });
    cacheMunicipalities(results);
    return results;
  } catch (error) {
    // Solo sin respuesta del servidor (sin red) se usa la copia; un error de la API (sesión
    // vencida, sin permiso) se muestra como siempre.
    const cached = isApiError(error) ? null : readCachedMunicipalities();
    if (cached) return cached;
    throw error;
  }
}

// El catálogo casi nunca cambia: se pide una vez y se comparte entre pantallas. `offlineFirst`:
// sin conexión se intenta igual (y cae a la copia del dispositivo) en vez de quedar en pausa
// esperando la red.
export const useMunicipalities = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.municipalities(),
    queryFn: ({ signal }) => fetchMunicipalities(signal),
    staleTime: Infinity,
    networkMode: 'offlineFirst',
    enabled,
  });

export function useMunicipalityName(enabled = true) {
  const { data } = useMunicipalities(enabled);
  return (code: string) =>
    data?.find((municipality) => municipality.code === code)?.name ?? '—';
}
