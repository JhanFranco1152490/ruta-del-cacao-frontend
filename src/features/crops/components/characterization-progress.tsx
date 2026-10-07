'use client';

import { useSession } from '@/hooks/use-session';

import { usePlotsCharacterizations } from '../api';
import { useQueuedCharacterizations } from '../use-characterization-queue';

// Cuántas parcelas de la página ya tienen ficha, en el servidor o esperando en el dispositivo:
// de un vistazo se ve lo que falta. Mientras no se sabe, no dice nada.
export function CharacterizationProgress({
  plotIds,
}: {
  plotIds: readonly string[];
}) {
  const { data: user } = useSession();
  const server = usePlotsCharacterizations(user?.id, plotIds);
  const queued = useQueuedCharacterizations(user?.id, plotIds);
  if (!server.data || !queued.items) return null;

  const characterized = new Set([
    ...server.data.data.map((item) => item.plot_id),
    ...queued.items.map((item) => item.plotId),
  ]);
  const done = plotIds.filter((id) => characterized.has(id)).length;
  const total = plotIds.length;
  return (
    <p className="font-bold text-selva" role="status">
      Caracterizadas: {done} de {total} {total === 1 ? 'parcela' : 'parcelas'}{' '}
      de esta página.
    </p>
  );
}
