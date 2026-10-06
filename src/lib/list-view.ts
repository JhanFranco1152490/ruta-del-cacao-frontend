// Dos maneras de ver una lista de varios productores: todas las filas juntas o plegadas en un
// grupo por productor.
export const LIST_VIEWS = ['lista', 'agrupada'] as const;
export type ListView = (typeof LIST_VIEWS)[number];
