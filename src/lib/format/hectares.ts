import { formatDecimal } from './decimal';

// La API entrega las áreas como decimales en texto con dos decimales: "2.40" se lee "2,4 ha".
export const formatHectareValue = formatDecimal;

export const formatHectares = (value: string) =>
  `${formatHectareValue(value)} ha`;

const toCentihectares = (value: string) => Math.round(Number(value) * 100);

// Área de la finca menos la asignada, sin los errores de coma flotante de restar decimales.
export const availableHectares = (total: string, allocated: string) =>
  ((toCentihectares(total) - toCentihectares(allocated)) / 100).toFixed(2);

// Qué parte del área de la finca está asignada, entre 0 y 100 (para la barra).
export const allocatedPercentage = (total: string, allocated: string) => {
  const totalCentihectares = toCentihectares(total);
  if (totalCentihectares <= 0) return 0;
  const ratio = toCentihectares(allocated) / totalCentihectares;
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
};
