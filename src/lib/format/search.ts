// Sin tildes ni mayúsculas: quien escribe "cucuta" en el teléfono espera encontrar "Cúcuta".
export const normalizeSearchText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
    .trim();

export function matchesSearch(fields: readonly string[], search: string) {
  const needle = normalizeSearchText(search);
  if (!needle) return true;
  return fields.some((field) => normalizeSearchText(field).includes(needle));
}
