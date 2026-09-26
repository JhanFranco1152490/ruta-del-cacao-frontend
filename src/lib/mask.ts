export function maskValue(value: string) {
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}
