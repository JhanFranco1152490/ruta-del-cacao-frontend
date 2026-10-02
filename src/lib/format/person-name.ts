// Nombre y apellidos de una persona en una sola línea. Vacío si la cuenta no tiene nombres.
export function fullName({
  first_name,
  last_name,
}: {
  first_name?: string;
  last_name?: string;
}) {
  return [first_name, last_name].filter(Boolean).join(' ').trim();
}
