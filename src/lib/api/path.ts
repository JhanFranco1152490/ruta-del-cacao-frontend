type QueryValue = string | number | boolean | null | undefined;

// Una ruta de la API con su consulta. Lo vacío (sin valor, null o texto vacío) no se manda: el
// servidor lo tomaría como un filtro que no coincide con nada.
export function apiPath(path: string, query: Record<string, QueryValue> = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.size ? `${path}?${params}` : path;
}
