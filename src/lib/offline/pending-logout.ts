import { isNetworkFailure } from '@/lib/api/errors';
import { postLogout } from '@/lib/api/logout';

const PENDING_LOGOUT_KEY = 'cacao-pending-logout';

// Sin conexión no se puede cerrar la sesión en el servidor: las cookies son `HttpOnly` y solo él
// las revoca. El cierre local se hace igual (se olvida la copia de la sesión y las lecturas
// guardadas), y esta marca recuerda que falta avisar al servidor. Mientras esté puesta, nada
// debe restaurar la sesión: al volver la red las cookies seguirían valiendo, y la persona
// reaparecería dentro de una cuenta que cerró. Por eso `fetchSession` y el inicio de sesión
// envían el cierre pendiente antes de seguir.
export function markPendingLogout() {
  try {
    window.localStorage.setItem(PENDING_LOGOUT_KEY, '1');
  } catch {
    // Sin almacenamiento local no hay dónde recordarlo: el cierre local ya se hizo y la sesión
    // vence sola, lo que es mejor que impedir cerrar.
  }
}

export function hasPendingLogout() {
  try {
    return window.localStorage.getItem(PENDING_LOGOUT_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearPendingLogout() {
  try {
    window.localStorage.removeItem(PENDING_LOGOUT_KEY);
  } catch {
    // Igual que al marcar.
  }
}

// Envía el cierre pendiente. Sin respuesta del servidor falla y deja la marca; si el servidor
// responde, aunque sea con un error (la sesión ya no existía, o falló), la marca se quita:
// reintentar para siempre dejaría a la persona sin poder volver a entrar.
export async function flushPendingLogout() {
  if (!hasPendingLogout()) return;
  try {
    await postLogout();
  } catch (error) {
    if (isNetworkFailure(error)) throw error;
  }
  clearPendingLogout();
}
