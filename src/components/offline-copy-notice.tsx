import { CloudOff } from 'lucide-react';

import { formatTimestamp } from '@/lib/format/dates';

// La pantalla sale de la copia guardada en el dispositivo porque el servidor no respondió.
// `consequence` dice, si hace falta, qué no se puede hacer así.
export function OfflineCopyNotice({
  savedAt,
  consequence,
}: {
  savedAt: number | undefined;
  consequence?: string;
}) {
  const copy =
    savedAt === undefined
      ? 'estás viendo la copia guardada'
      : `estás viendo la copia del ${formatTimestamp(savedAt)}`;
  // La hora termina en «a.m.» o «p.m.»: no se le suma otro punto.
  const sentence = copy.endsWith('.') ? copy : `${copy}.`;
  return (
    <p
      className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm font-bold"
      role="status"
    >
      <CloudOff aria-hidden="true" className="size-5 shrink-0" />
      <span>
        Sin conexión: {sentence}
        {consequence && ` ${consequence}`}
      </span>
    </p>
  );
}
