// Una tabla de varias columnas no cabe en un celular: por debajo de `md` cada fila se vuelve una
// tarjeta compacta de pocas líneas, con las celdas como elementos que se acomodan en ellas. Sin la
// etiqueta de cada dato (el valor se entiende solo, como «Cúcuta» o «CC ••••0004»), porque la
// versión con «etiqueta: valor» por línea cuadruplicaba el alto de la lista. Cada tabla decide en
// qué línea va cada celda con `max-md:order-*`, `max-md:col-span-1` y `max-md:justify-self-end`; la fila de títulos queda solo
// para lectores de pantalla.
export const COMPACT_TABLE_CLASS = [
  'max-md:block',
  'max-md:[&_thead]:sr-only',
  'max-md:[&_tbody]:block',
  // Dos columnas: el nombre y su estado arriba, y cada dato que sigue ocupa el ancho (`col-span-2`,
  // el valor por defecto) o una mitad. `!` en el borde porque el cuerpo de la tabla se lo quita a la
  // última fila. `pr-10` deja sitio a la flecha que cubre la tarjeta.
  'max-md:[&_tr]:relative max-md:[&_tr]:mb-2 max-md:[&_tr]:grid max-md:[&_tr]:grid-cols-[minmax(0,1fr)_auto] max-md:[&_tr]:gap-x-3 max-md:[&_tr]:gap-y-0.5 max-md:[&_tr]:rounded-lg max-md:[&_tr]:border! max-md:[&_tr]:border-border max-md:[&_tr]:p-3 max-md:[&_tr]:pr-10',
  'max-md:[&_td]:col-span-2 max-md:[&_td]:max-w-none max-md:[&_td]:min-w-0 max-md:[&_td]:p-0 max-md:[&_td]:text-sm max-md:[&_td]:whitespace-normal',
].join(' ');

// El botón de «ver» de una fila de celular: cubre toda la tarjeta, así que tocarla la abre, y solo
// deja a la vista una flecha. En pantallas anchas es el botón de siempre.
export const ROW_LINK_CLASS =
  'max-md:absolute max-md:inset-0 max-md:h-full max-md:w-full max-md:justify-end max-md:rounded-lg max-md:border-0 max-md:bg-transparent max-md:px-3 max-md:hover:bg-transparent';
