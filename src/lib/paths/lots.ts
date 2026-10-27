export const LOTS_PATH = '/lotes';

// Ruta fija con el lote en la URL, como el resto de los detalles.
export const lotDetailPath = (id: string) =>
  `/lotes/detalle?${new URLSearchParams({ id })}`;
