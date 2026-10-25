import type { Fermentation } from '../api';
import { cardDetails } from '../card-details';
import { turnsText } from '../fermentation-time';
import type { QueuedTurn } from '../turn-queue';
import { CardTimeline } from './card-timeline';
import {
  CardTitle,
  lastMeasurement,
  lastTurnNote,
  NextTurnLine,
} from './card-parts';
import { FermentationCardActions } from './fermentation-card-actions';

// Un lote en fermentación: dónde está, su línea de tiempo (volteos hechos y el próximo), cuánto
// lleva, su última medición y cuándo toca el siguiente volteo. Un volteo atrasado lleva ícono y
// texto además del color.
export function FermentationCard({
  fermentation,
  now,
  queued,
  lotHref,
  canManage,
  online,
}: {
  fermentation: Fermentation;
  now: Date;
  // Los volteos que siguen en la cola del teléfono, de cualquier lote.
  queued: readonly QueuedTurn[];
  lotHref: (id: string) => string;
  // Finalizar es de quien responde por la fermentación y necesita conexión: libera el cajón.
  canManage: boolean;
  online: boolean;
}) {
  const details = cardDetails(fermentation, now, queued);
  const { hours, turnCount, last, next } = details;

  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-card p-4 shadow-card">
      <CardTitle fermentation={fermentation} />
      <CardTimeline details={details} />
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-bold text-selva">{hours} h</span> de
          fermentación
          {turnCount > 0 && ` · ${turnsText(turnCount)}`}
        </p>
        <p>
          <span className="font-bold text-selva">{lastMeasurement(last)}</span>
          {last && (
            <span className="block text-xs text-muted-foreground">
              {lastTurnNote(last)}
            </span>
          )}
        </p>
        <NextTurnLine next={next} />
      </div>
      <FermentationCardActions
        canManage={canManage}
        fermentation={fermentation}
        lotHref={lotHref}
        online={online}
        queued={queued}
      />
    </li>
  );
}
