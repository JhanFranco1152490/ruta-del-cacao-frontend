import type { Fact } from '../quality-card-facts';

// Tres cifras cortas en una fila, cada una con su nombre encima: los porcentajes de la evaluación o
// los kilos de la clasificación. Una fila también en celular.
export function QualityFacts({
  label,
  facts,
}: {
  label: string;
  facts: readonly Fact[];
}) {
  return (
    <dl aria-label={label} className="grid grid-cols-3 gap-2">
      {facts.map((fact) => (
        <div className="flex flex-col justify-between" key={fact.label}>
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd className="font-bold text-selva tabular-nums">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
