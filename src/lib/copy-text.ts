import { notify } from '@/lib/notify';

// Copia un texto al portapapeles y lo avisa. El navegador puede negarlo (sin permiso o fuera de un
// contexto seguro), y entonces la persona lo copia a mano.
export async function copyText(
  text: string,
  messages: { success: string; failure: string },
) {
  try {
    await navigator.clipboard.writeText(text);
    notify.success(messages.success);
  } catch {
    notify.error(messages.failure);
  }
}
