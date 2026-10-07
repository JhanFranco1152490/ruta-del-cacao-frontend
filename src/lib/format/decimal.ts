const DECIMAL = new Intl.NumberFormat('es', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// La API entrega los decimales como texto con dos decimales: "46.50" se lee "46,5".
export const formatDecimal = (value: string) => DECIMAL.format(Number(value));
