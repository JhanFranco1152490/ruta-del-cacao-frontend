import { WaitingDetectionRow } from './waiting-detection-row';
import type { WaitingDetection } from '../waiting-detections';

// Las detecciones en que alguien pidió que se programara un control y nadie lo ha atendido: quien
// programa decide aquí, sin pasar por el calendario.
export function WaitingControlsSection({
  detections,
  producer,
}: {
  detections: readonly WaitingDetection[];
  producer: string | null;
}) {
  if (detections.length === 0) return null;
  return (
    <section
      aria-label="Controles por atender"
      className="relative space-y-3 overflow-hidden rounded-[var(--radius-card)] bg-card p-4 pt-5 shadow-card before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[var(--morado-cacao)]"
    >
      <h2 className="font-sans text-base font-extrabold text-selva">
        Controles por atender ({detections.length})
      </h2>
      <p className="text-sm text-muted-foreground">
        Alguien pidió que se programara un control. Prográmalo o decide que no
        hace falta.
      </p>
      <ul className="space-y-3">
        {detections.map((detection) => (
          <WaitingDetectionRow
            detection={detection}
            key={detection.id}
            producer={producer}
          />
        ))}
      </ul>
    </section>
  );
}
