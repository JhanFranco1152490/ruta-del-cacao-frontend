import { CircleAlert, CircleCheck } from 'lucide-react';

import { cn } from 'cn';

import type { Insight } from '../indicator-insights';

// Lo que el productor debe mirar, en frases cortas. Color, ícono y texto: nunca el color solo. Sin
// frases no ocupa lugar.
export function InsightsStrip({ insights }: { insights: readonly Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <ul aria-label="Para tener en cuenta" className="motion-stagger space-y-2">
      {insights.map(({ key, tone, text }) => {
        const Icon = tone === 'warn' ? CircleAlert : CircleCheck;
        return (
          <li
            className={cn(
              'flex items-start gap-3 rounded-lg border-l-4 bg-card p-3 shadow-card',
              tone === 'warn' ? 'border-cobre' : 'border-hoja',
            )}
            key={key}
          >
            <Icon
              aria-hidden="true"
              className={cn(
                'mt-0.5 size-5 shrink-0',
                tone === 'warn' ? 'text-cobre' : 'text-hoja',
              )}
            />
            <span>
              <span className="font-bold text-selva">
                {tone === 'warn' ? 'Atender: ' : 'Bien: '}
              </span>
              {text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
