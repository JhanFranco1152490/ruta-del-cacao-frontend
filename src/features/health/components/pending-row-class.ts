// Una fila de la pestaña Pendiente es una tarjeta pequeña: con un enlace, tocarla en cualquier
// parte lo abre, no solo el botón. El enlace se estira sobre toda la tarjeta con un `::after`, así
// que la tarjeta es `relative` y el enlace no.
export const ROW_CLASS =
  'relative flex items-center justify-between gap-3 rounded-lg border border-border p-3';

export const LINKED_ROW_CLASS =
  'hover:bg-surface-alt has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-cobre';

export const STRETCHED_LINK_CLASS =
  'after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none';
