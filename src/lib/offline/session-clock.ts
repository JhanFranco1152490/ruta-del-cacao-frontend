import { getOfflineDb } from './db';

const LAST_LOGIN_KEY = 'lastLoginAt';
const DAY_MS = 24 * 60 * 60 * 1000;

export const OFFLINE_WINDOW_DAYS = 7;
export const ORPHAN_WINDOW_DAYS = 30;

export async function recordLogin(userId: string, now = Date.now()) {
  try {
    await getOfflineDb(userId).meta.put({
      key: LAST_LOGIN_KEY,
      value: String(now),
    });
  } catch {
    // Un fallo de guardado local (cuota llena, almacenamiento bloqueado) no debe convertirse
    // en una promesa rechazada sin manejar: quien llama a `recordLogin` no la espera.
  }
}

async function getLastLoginAt(userId: string) {
  const entry = await getOfflineDb(userId).meta.get(LAST_LOGIN_KEY);
  return entry ? Number(entry.value) : undefined;
}

// Antes del primer inicio de sesión registrado no hay ventana que ofrecer: se exige conexión.
export async function isWithinOfflineWindow(userId: string, now = Date.now()) {
  const lastLoginAt = await getLastLoginAt(userId);
  if (lastLoginAt === undefined) return false;
  return now - lastLoginAt <= OFFLINE_WINDOW_DAYS * DAY_MS;
}

export async function isOrphaned(userId: string, now = Date.now()) {
  const lastLoginAt = await getLastLoginAt(userId);
  if (lastLoginAt === undefined) return false;
  return now - lastLoginAt > ORPHAN_WINDOW_DAYS * DAY_MS;
}
