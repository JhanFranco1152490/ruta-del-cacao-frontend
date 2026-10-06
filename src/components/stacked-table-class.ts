// Una tabla de varias columnas no cabe en un celular: por debajo de `md` cada fila se vuelve una
// tarjeta con "etiqueta: valor" por línea. Las celdas llevan su etiqueta en `data-label`; la fila
// de títulos se deja solo para lectores de pantalla.
export const STACKED_TABLE_CLASS = [
  'max-md:block',
  'max-md:[&_thead]:sr-only',
  'max-md:[&_tbody]:block',
  'max-md:[&_tr]:mb-3 max-md:[&_tr]:block max-md:[&_tr]:rounded-lg max-md:[&_tr]:border max-md:[&_tr]:border-border max-md:[&_tr]:p-3',
  'max-md:[&_td]:flex max-md:[&_td]:items-baseline max-md:[&_td]:justify-between max-md:[&_td]:gap-4 max-md:[&_td]:px-0 max-md:[&_td]:py-1.5 max-md:[&_td]:whitespace-normal',
  'max-md:[&_td]:before:shrink-0 max-md:[&_td]:before:text-sm max-md:[&_td]:before:font-bold max-md:[&_td]:before:text-muted-foreground max-md:[&_td]:before:content-[attr(data-label)]',
].join(' ');
