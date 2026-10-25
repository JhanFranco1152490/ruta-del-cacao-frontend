import { formatFixedDecimal } from '@/lib/format/decimal';

// Un peso en kg con un decimal, en décimas de kg enteras: así la cuenta no arrastra errores de
// coma flotante.
const tenths = (kg: string | number) => Math.round(Number(kg) * 10);

// El rendimiento: peso seco ÷ peso en verde × 100, con un decimal y la mitad hacia arriba, como lo
// calcula el servidor. `null` si falta alguno de los dos pesos o el verde no es mayor que cero.
export function computeYield(
  dryWeightKg: string,
  greenWeightKg: string,
): number | null {
  if (!dryWeightKg || Number.isNaN(Number(dryWeightKg))) return null;
  const green = tenths(greenWeightKg);
  if (green <= 0) return null;
  return (
    Math.floor((2 * tenths(dryWeightKg) * 1000 + green) / (2 * green)) / 10
  );
}

// «38,2 %».
export const yieldText = (percent: string | number) =>
  `${formatFixedDecimal(percent, 1)} %`;
