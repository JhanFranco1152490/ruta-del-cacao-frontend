// Las cantidades llegan como texto con hasta 3 decimales ("-12.500"). Se suman como enteros de
// milésimas: con números de punto flotante, 0.1 + 0.2 no da 0.3.
const SCALE = BigInt(1000);
const ZERO = BigInt(0);

function toThousandths(value: string): bigint {
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace('-', '').split('.');
  const thousandths =
    BigInt(whole || '0') * SCALE + BigInt(fraction.padEnd(3, '0').slice(0, 3));
  return negative ? -thousandths : thousandths;
}

function fromThousandths(value: bigint): string {
  const negative = value < ZERO;
  const abs = negative ? -value : value;
  const fraction = String(abs % SCALE).padStart(3, '0');
  return `${negative ? '-' : ''}${abs / SCALE}.${fraction}`;
}

export function sumQuantities(values: readonly string[]): string {
  return fromThousandths(
    values.reduce((total, value) => total + toThousandths(value), ZERO),
  );
}
