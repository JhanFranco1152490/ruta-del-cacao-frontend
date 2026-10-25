// Cuánto hace que se cosechó el lote, con las palabras con que se dice.
export function harvestAgeText(days: number) {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}
