import { cn } from 'cn';

import type { BarTone } from '../quality-card-facts';
import { BAR_TONE_CLASS } from './quality-bar';

// El peso seco repartido entre G1, G2 y descarte en una sola barra. Es decorativa para quien ve: el
// reparto en cifras va siempre escrito junto a ella, y para el lector de pantalla lo dice `label`.
export function QualityGradeBar({
  label,
  segments,
}: {
  label: string;
  segments: readonly { label: string; width: number; tone: BarTone }[];
}) {
  return (
    <div
      aria-label={label}
      className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted"
      role="img"
    >
      {segments.map(({ label: name, width, tone }) => (
        <div
          className={cn('h-full', BAR_TONE_CLASS[tone])}
          key={name}
          style={{ width: `${width}%` }}
        />
      ))}
    </div>
  );
}
