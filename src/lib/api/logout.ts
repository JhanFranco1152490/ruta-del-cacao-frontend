import { apiFetch } from './client';

// Vive en `lib/` porque lo envían tanto el cierre de sesión como la sesión pendiente de cerrar
// (`lib/offline/pending-logout`), y `lib/` no importa de `features/`.
export const postLogout = () =>
  apiFetch<void>('/api/auth/logout', { method: 'POST' });
