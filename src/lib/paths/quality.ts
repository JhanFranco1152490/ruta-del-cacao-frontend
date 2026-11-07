export const QUALITY_PATH = '/calidad';

export const QUALITY_ACTIONS = [
  'evaluar',
  'corregir',
  'clasificar',
  'descartar',
] as const;
export type QualityAction = (typeof QUALITY_ACTIONS)[number];

// Abre la pantalla de calidad con el formulario de un lote: la ficha del lote y Lotes llevan aquí.
export const qualityActionPath = (lotId: string, action: QualityAction) =>
  `${QUALITY_PATH}?${new URLSearchParams({ lote: lotId, accion: action })}`;
