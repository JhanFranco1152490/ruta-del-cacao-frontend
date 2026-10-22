import {
  STRETCHED_CARD_FOCUS_CLASS,
  STRETCHED_LINK_CLASS,
} from '@/components/stretched-link-class';

// Una fila de la pestaña Pendiente es una tarjeta pequeña: con un enlace, tocarla en cualquier
// parte lo abre, no solo el botón (ver `stretched-link-class`).
export const ROW_CLASS =
  'relative flex items-center justify-between gap-3 rounded-lg border border-border p-3';

export const LINKED_ROW_CLASS = `hover:bg-surface-alt ${STRETCHED_CARD_FOCUS_CLASS}`;

export { STRETCHED_LINK_CLASS };
