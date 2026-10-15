import type { components } from '@/lib/api/schema';

import { getOfflineDb } from './db';
import { isWithinOfflineWindow } from './session-clock';

type SessionUser = components['schemas']['SessionUser'];

// Solo el id: no es un dato personal, y dice qué base abrir antes de tener sesión.
const LAST_USER_KEY = 'cacao-last-user';
const SNAPSHOT_KEY = 'session';

// Qué fincas alcanza la cuenta. Una copia anterior a las fincas no trae los campos: cuenta como
// distinta, porque entonces alcanzaba todas las del productor.
const farmScopeOf = (user: Partial<SessionUser>) =>
  user.all_farms
    ? '*'
    : (user.farms ?? [])
        .map(({ id }) => id)
        .sort()
        .join(',');

// Copia de la cuenta que el servidor confirmó por última vez. Deja entrar sin conexión dentro de
// la ventana; no reemplaza la autenticación: el servidor revalida al volver la red.
//
// Si las fincas de la cuenta cambiaron desde la copia anterior, borra lo que el dispositivo
// guardaba de ellas (las lecturas; la cola se conserva, como al cerrar sesión) y responde `true`
// para que quien llama descarte también lo que tiene en memoria.
export async function saveSessionSnapshot(user: SessionUser) {
  try {
    const db = getOfflineDb(user.id);
    const previous = await db.meta.get(SNAPSHOT_KEY);
    const farmsChanged =
      !!previous &&
      farmScopeOf(JSON.parse(previous.value) as Partial<SessionUser>) !==
        farmScopeOf(user);
    if (farmsChanged) await db.cache.clear();
    await db.meta.put({
      key: SNAPSHOT_KEY,
      value: JSON.stringify(user),
    });
    window.localStorage.setItem(LAST_USER_KEY, user.id);
    return farmsChanged;
  } catch {
    // Solo se pierde la entrada sin conexión.
    return false;
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

// El servidor rechazó la sesión: la copia de la última cuenta ya no abre la app sin conexión.
export async function forgetLastSession() {
  try {
    const userId = window.localStorage.getItem(LAST_USER_KEY);
    if (userId) await clearSessionSnapshot(userId);
  } catch {
    // Sin acceso al almacenamiento no hay copia que olvidar.
  }
}
