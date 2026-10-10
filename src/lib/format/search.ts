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

// Para comparar nombres de un catálogo como lo hace el servidor: "CCN 51", "CCN51" y "ccn-51" son
// el mismo, igual que "Urea 46%" y "urea 46 %". También los guiones que llegan al pegar un nombre
// copiado de un documento: guion, guion sin salto, cifra, semiraya, raya y signo menos.
export const normalizeCatalogName = (name: string) =>
  name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[\s\-\u2010-\u2014\u2212]+/gu, '');
