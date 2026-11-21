// Dónde está el cacao, como lo lee Bodega: «Bodega principal · Estante 1», o sin la ubicación,
// que es opcional al ingresar.
export const placeText = (warehouse: string, location: string) =>
  location.trim() ? `${warehouse} · ${location.trim()}` : warehouse;
