import { CloudOff } from 'lucide-react';

import { formatTimestamp } from '@/lib/format/dates';

// La lista sin conexión sale de la copia del dispositivo. Los volteos se registran igual; iniciar y
// finalizar ocupan y liberan un cajón, y eso lo decide el servidor.
export function FermentationOfflineNotice({
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
      Sin conexión: {copy}. Iniciar o finalizar una fermentación necesita
      conexión.
    </p>
  );
}
