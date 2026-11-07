import { cn } from 'cn';
import { ClipboardCheck, Medal } from 'lucide-react';

import type { SectionFact } from '../quality-section-view';
import { BAR_TONE_CLASS, QualityBar } from './quality-bar';
import { QualityGradeBar } from './quality-grade-bar';

function Subtitle({ children }: { children: string }) {
  return (
    <h3 className="text-xs font-bold tracking-wide text-cobre uppercase">
      {children}
    </h3>
  );
}

// Los tres porcentajes de la prueba de corte, cada uno con su barra, y la suma debajo: lo que falta
// para 100 son granos que no caen en ninguna de las tres categorías.
export function EvaluationBlock({
  facts,
  notes,
}: {
  facts: readonly SectionFact[];
  notes: string | null;
}) {
  const sum = facts.find(({ bar }) => !bar);
  return (
    <div className="space-y-3">
      <Subtitle>Evaluación física</Subtitle>
      <dl className="space-y-3">
        {facts
          .filter(({ bar }) => bar)
          .map(({ label, value, bar }) => (
            <div className="space-y-1" key={label}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-bold text-selva tabular-nums">{value}</dd>
              </div>
              {bar && <QualityBar tone={bar.tone} width={bar.width} />}
            </div>
          ))}
      </dl>
      {sum && (
        <p className="flex items-baseline justify-between gap-3 border-t border-divider pt-2 text-sm">
          <span className="text-muted-foreground">{sum.label}</span>
          <span className="font-bold text-selva tabular-nums">{sum.value}</span>
        </p>
      )}
      {notes && (
        <div className="rounded-(--radius) border-l-4 border-cobre bg-surface-alt px-3 py-2">
          <p className="text-xs font-bold text-muted-foreground">
            Observaciones
          </p>
          <p>{notes}</p>
        </div>
      )}
    </div>
  );
}

// El peso seco repartido entre G1, G2 y descarte en una sola barra, con cada parte escrita debajo.
export function ClassificationBlock({
  facts,
  discardReason,
}: {
  facts: readonly SectionFact[];
  discardReason: string | null;
}) {
  const summary = facts
    .map(({ label, value }) => `${label} ${value}`)
    .join(', ');
  return (
    <div className="space-y-3">
      <Subtitle>Clasificación</Subtitle>
      <QualityGradeBar
        label={summary}
        segments={facts.flatMap(({ label, bar }) =>
          bar ? [{ label, width: bar.width, tone: bar.tone }] : [],
        )}
      />
      <dl className="space-y-2">
        {facts.map(({ label, value, bar }) => (
          <div
            className="flex items-baseline justify-between gap-3"
            key={label}
          >
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                aria-hidden="true"
                className={cn(
                  'size-2.5 rounded-full',
                  bar ? BAR_TONE_CLASS[bar.tone] : 'bg-muted',
                )}
              />
              {label}
            </dt>
            <dd className="font-bold text-selva tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {discardReason && (
        <p className="flex flex-wrap gap-x-2 rounded-(--radius) bg-warn-bg px-3 py-2 text-sm text-warn">
          <span className="font-bold">Motivo del descarte</span>
          <span>{discardReason}</span>
        </p>
      )}
    </div>
  );
}

// Quién hizo cada paso y cuándo: la huella de la decisión.
export function ResponsibleLines({
  evaluatedBy,
  classifiedBy,
}: {
  evaluatedBy: string | null;
  classifiedBy: string | null;
}) {
  const lines = [
    { Icon: ClipboardCheck, text: evaluatedBy },
    { Icon: Medal, text: classifiedBy },
  ].filter((line): line is { Icon: typeof Medal; text: string } => !!line.text);
  if (lines.length === 0) return null;
  return (
    <ul className="space-y-1 border-t border-divider pt-3">
      {lines.map(({ Icon, text }) => (
        <li
          className="flex items-start gap-2 text-sm text-muted-foreground"
          key={text}
        >
          <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {text}
        </li>
      ))}
    </ul>
  );
}
