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

const fixedFormatters = new Map<number, Intl.NumberFormat>();

// Una medición se lee con los mismos decimales siempre («45,0 °C», «pH 4,90»): quitarle los ceros
// hace que dos lecturas de un mismo instrumento parezcan de precisión distinta.
export const formatFixedDecimal = (
  value: string | number,
  decimals: number,
) => {
  let formatter = fixedFormatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    fixedFormatters.set(decimals, formatter);
  }
  return formatter.format(Number(value));
};
