import { normalizeCatalogName } from '@/lib/format/search';

// Como los nombres de un catálogo, y además sin puntos: «S.A.S.» y «SAS» son la misma razón
// social. Solo la usa el dispositivo (la búsqueda y el aviso de nombre parecido); el servidor no
// compara nombres de compradores.
export const normalizeBuyerName = (text: string) =>
  normalizeCatalogName(text).replace(/\./g, '');
