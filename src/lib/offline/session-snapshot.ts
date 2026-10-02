import type { components } from '@/lib/api/schema';

import { getOfflineDb } from './db';
import { isWithinOfflineWindow } from './session-clock';

type SessionUser = components['schemas']['SessionUser'];

// Solo el id: no es un dato personal, y dice qué base abrir antes de tener sesión.
const LAST_USER_KEY = 'cacao-last-user';
const SNAPSHOT_KEY = 'session';

// Copia de la cuenta que el servidor confirmó por última vez. Deja entrar sin conexión dentro de
// la ventana; no reemplaza la autenticación: el servidor revalida al volver la red.
export async function saveSessionSnapshot(user: SessionUser) {
  try {
    await getOfflineDb(user.id).meta.put({
      key: SNAPSHOT_KEY,
      value: JSON.stringify(user),
    });
    window.localStorage.setItem(LAST_USER_KEY, user.id);
  } catch {
    // Solo se pierde la entrada sin conexión.
  }
}

export async function readSessionSnapshot(now = Date.now()) {
  try {
    const userId = window.localStorage.getItem(LAST_USER_KEY);
    if (!userId || !(await isWithinOfflineWindow(userId, now))) return null;
    const entry = await getOfflineDb(userId).meta.get(SNAPSHOT_KEY);
    return entry ? (JSON.parse(entry.value) as SessionUser) : null;
  } catch {
    return null;
  }
}

export async function clearSessionSnapshot(userId: string) {
  try {
    await getOfflineDb(userId).meta.delete(SNAPSHOT_KEY);
    if (window.localStorage.getItem(LAST_USER_KEY) === userId) {
      window.localStorage.removeItem(LAST_USER_KEY);
    }
  } catch {
    // Igual que al guardar: un fallo local no debe romper el cierre de sesión.
  }
}
