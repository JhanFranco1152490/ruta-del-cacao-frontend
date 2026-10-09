import type { InputMovement } from './api';
import { formatQuantity } from './stock-format';

export const MOVEMENT_KIND_LABELS: Record<InputMovement['kind'], string> = {
  entry: 'Entrada',
  count: 'Conteo',
  consumption: 'Salida por actividad',
};

// Una cantidad con su signo, también la positiva: "+300 mL", "−50 mL".
const signed = (quantity: string, unit: string) => {
  const text = formatQuantity(quantity, unit);
  return Number(quantity) > 0 ? `+${text}` : text;
};

// Lo que cambió un movimiento en las existencias. En el conteo, lo contado y la diferencia que
// dejó: "Conteo: 230 mL (−20 mL)".
export function describeMovementAmount(movement: InputMovement, unit: string) {
  if (movement.kind === 'count' && movement.counted_quantity !== null) {
    const counted = formatQuantity(movement.counted_quantity, unit);
    const difference =
      Number(movement.quantity) === 0
        ? 'sin diferencia'
        : signed(movement.quantity, unit);
    return `Conteo: ${counted} (${difference})`;
  }
  return signed(movement.quantity, unit);
}
