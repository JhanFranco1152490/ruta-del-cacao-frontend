import { cn } from 'cn';

import type { BarTone } from '../quality-card-facts';

export const BAR_TONE_CLASS: Record<BarTone, string> = {
  ok: 'bg-ok-solid',
  info: 'bg-info-solid',
  warn: 'bg-warn-solid',
  err: 'bg-err-solid',
};

// Una barra de 0 a 100. Es decorativa: la cifra que dibuja siempre está escrita al lado.
export function QualityBar({ width, tone }: { width: number; tone: BarTone }) {
  return (
    <div
      aria-hidden="true"
      className="h-2.5 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn('h-full rounded-full', BAR_TONE_CLASS[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
