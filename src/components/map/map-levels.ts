export const MAP_LEVELS = 5;

// Tono de un municipio según sus fincas frente al que más tiene: 0 es "sin fincas" y cada uno
// de los demás cubre una quinta parte del máximo.
export function levelOf(count: number, max: number) {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(MAP_LEVELS, Math.ceil((count / max) * MAP_LEVELS));
}
