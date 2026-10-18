import type { PestSummary } from '../history-api';
import { summaryText } from '../history-summary';

// Cómo evoluciona cada plaga en la parcela elegida: la última incidencia frente a la anterior. Solo
// con una parcela: comparar parcelas distintas no dice si una plaga sube o baja.
export function PestSummarySection({
  summary,
}: {
  summary: readonly PestSummary[];
}) {
  if (summary.length === 0) return null;
  return (
    <section
      aria-label="Resumen por plaga"
      className="rounded-[var(--radius-card)] bg-card p-5 shadow-card"
    >
      <p className="section-label">Resumen por plaga</p>
      <ul className="mt-2 space-y-1">
        {summary.map((row) => (
          <li
            key={`${row.pest_disease?.id ?? row.other_description}-${row.sampling_unit}`}
          >
            {summaryText(row)}
          </li>
        ))}
      </ul>
    </section>
  );
}
