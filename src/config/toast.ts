export type ToastPosition = {
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'center' | 'right';
};

// Dónde salen los avisos. En celular ocupan casi todo el ancho y solo cuenta si van arriba o abajo;
// en pantallas anchas cuenta también el lado. Es el único valor que hay que cambiar.
export const DEFAULT_TOAST_POSITION: ToastPosition = {
  vertical: 'bottom',
  horizontal: 'right',
};

// Cuántos avisos se ven a la vez; los más viejos se retiran antes de tiempo.
export const TOAST_LIMIT = 3;

// Cuánto dura un aviso en pantalla. Con una acción dura más: quien la quiere tiene que alcanzarla,
// con guantes o con una sola mano. Un error de una acción no se cierra solo.
export const TOAST_DURATION_MS = {
  notice: 5000,
  withAction: 8000,
  persistent: 0,
} as const;
