// Debajo de la cabecera y de la fila fija de íconos: con la página arriba, una etapa cuenta como la
// que se está leyendo cuando su borde superior ya pasó esta línea.
export const READING_LINE_PX = 150;

// Cuál etapa se está leyendo, dados los bordes superiores de todas (en pantalla, en orden) y cuánto
// se ha desplazado la página. La línea de lectura baja del borde de arriba al de abajo de la pantalla
// a medida que se avanza, hasta el final: las últimas etapas nunca llegan arriba, porque la página
// se acaba antes, y con una línea fija se saltarían de golpe a la última. Así se marcan una a una.
export function activeStageIndex(
  tops: readonly number[],
  {
    viewportHeight,
    scrollY,
    maxScroll,
  }: {
    viewportHeight: number;
    scrollY: number;
    maxScroll: number;
  },
) {
  if (tops.length === 0) return 0;
  const progress = maxScroll > 0 ? Math.min(1, scrollY / maxScroll) : 0;
  if (maxScroll > 0 && maxScroll - scrollY <= 2) return tops.length - 1;
  const line = READING_LINE_PX + (viewportHeight - READING_LINE_PX) * progress;
  let active = 0;
  tops.forEach((top, index) => {
    if (top <= line) active = index;
  });
  return active;
}
