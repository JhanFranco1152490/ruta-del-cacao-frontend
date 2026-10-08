const formatters = new Map<number, Intl.NumberFormat>();

function formatterFor(maxDecimals: number) {
  let formatter = formatters.get(maxDecimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
    formatters.set(maxDecimals, formatter);
  }
  return formatter;
}

// La API entrega los decimales como texto con ceros a la derecha: "46.50" se lee "46,5".
export const formatDecimal = (value: string | number, maxDecimals = 2) =>
  formatterFor(maxDecimals).format(Number(value));
