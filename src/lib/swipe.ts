export type Point = { x: number; y: number };

// Cuánto tiene que recorrer el dedo para que cuente como un deslizamiento: un gesto amplio, para
// que tocar o rozar la pantalla al hacer scroll no cambie de periodo.
export const SWIPE_MIN_DISTANCE = 110;

// Cuánto más horizontal que vertical debe ser: un gesto en diagonal es un scroll.
const SWIPE_MIN_RATIO = 2;

// Hacia dónde fue un gesto del dedo, o `null` si no fue un deslizamiento horizontal amplio.
export function swipeDirection(
  start: Point,
  end: Point,
): 'left' | 'right' | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null;
  if (Math.abs(dx) < Math.abs(dy) * SWIPE_MIN_RATIO) return null;
  return dx < 0 ? 'left' : 'right';
}
