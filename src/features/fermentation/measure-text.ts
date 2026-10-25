import { formatFixedDecimal } from '@/lib/format/decimal';

// La temperatura va con un decimal y el pH con dos, como los valida y guarda el servidor.
export const temperatureText = (value: string | number) =>
  `${formatFixedDecimal(value, 1)} °C`;

export const phText = (value: string | number) => formatFixedDecimal(value, 2);
