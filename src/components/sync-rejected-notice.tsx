import type { ReactNode } from 'react';

// Lo que se guardó en el dispositivo y el servidor rechazó al enviarlo, con su motivo si lo dio.
export function syncFailureText(
  errorMessage?: string | null,
  subject?: string,
) {
  const what = subject
    ? `No se pudo sincronizar ${subject}`
    : 'No se pudo sincronizar';
  return errorMessage ? `${what}: ${errorMessage}` : `${what}.`;
}

// El aviso en el formulario que corrige ese registro; debajo, lo que la pantalla agregue (la
// versión del servidor, qué hacer para reenviarlo).
export function SyncRejectedNotice({
  errorMessage,
  children,
}: {
  errorMessage?: string | null;
  children?: ReactNode;
}) {
  return (
    <div
      className="mt-6 space-y-2 rounded-(--radius) bg-err-bg px-4 py-3 font-bold text-err"
      role="alert"
    >
      <p>{syncFailureText(errorMessage)}</p>
      {children}
    </div>
  );
}
