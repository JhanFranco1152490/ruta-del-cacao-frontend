import { CloudOff } from 'lucide-react';

import { formatTimestamp } from '@/lib/format/dates';

// La lista sin conexión: sale de la copia del dispositivo, y lo que escribe necesita la red.
export function FacilityOfflineNotice({
  savedAt,
}: {
  savedAt: number | undefined;
}) {
  const copy =
    savedAt === undefined
      ? 'estás viendo la copia guardada'
      : `estás viendo la copia del ${formatTimestamp(savedAt)}`;
  return (
    <p
      className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm font-bold"
      role="status"
    >
      <CloudOff aria-hidden="true" className="size-5 shrink-0" />
      Sin conexión: {copy}. Registrar o cambiar un elemento necesita conexión.
    </p>
  );
}
