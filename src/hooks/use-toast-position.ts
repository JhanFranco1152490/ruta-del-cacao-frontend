import { useSyncExternalStore } from 'react';

import { DEFAULT_TOAST_POSITION, type ToastPosition } from '@/config/toast';

// TEMPORAL, junto al selector de posición: en desarrollo la posición elegida se recuerda en el
// navegador; en producción y en las pruebas siempre es la de la configuración.
const STORAGE_KEY = 'toast-position';
const isDevelopment = () => process.env.NODE_ENV === 'development';

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: ToastPosition = DEFAULT_TOAST_POSITION;

function parse(raw: string | null): ToastPosition {
  if (!raw) return DEFAULT_TOAST_POSITION;
  try {
    const value = JSON.parse(raw) as ToastPosition;
    return value.vertical && value.horizontal ? value : DEFAULT_TOAST_POSITION;
  } catch {
    return DEFAULT_TOAST_POSITION;
  }
}

function getSnapshot(): ToastPosition {
  if (!isDevelopment()) return DEFAULT_TOAST_POSITION;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento: queda la posición de la configuración.
  }
  // La misma referencia mientras no cambie el texto guardado, para que React no vuelva a pintar.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

const getServerSnapshot = () => DEFAULT_TOAST_POSITION;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setToastPosition(position: ToastPosition) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    // Solo se pierde que se recuerde.
  }
  listeners.forEach((listener) => listener());
}

export const useToastPosition = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
