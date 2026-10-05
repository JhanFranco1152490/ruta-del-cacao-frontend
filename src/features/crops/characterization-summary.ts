import {
  formatCount,
  type Stage,
  STAGE_OPTIONS,
  totalTrees,
} from './characterization-rules';

export type SummaryLine = {
  varietyName: string;
  treeCount: number;
  stage: Stage;
};

export const stageLabel = (stage: Stage) =>
  STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;

const STAGE_ORDER = new Map<Stage, number>(
  STAGE_OPTIONS.map((option, index) => [option.value, index]),
);

// Suma los árboles por clave y devuelve la que tiene más, junto con cuántas otras hay.
function leadingKey<K extends string>(
  entries: readonly { key: K; trees: number }[],
  tieBreak: (a: K, b: K) => number,
): { lead: K | undefined; others: number } {
  const totals = new Map<K, number>();
  for (const { key, trees } of entries) {
    totals.set(key, (totals.get(key) ?? 0) + trees);
  }
  const [lead, ...rest] = [...totals].sort(
    ([keyA, treesA], [keyB, treesB]) => treesB - treesA || tieBreak(keyA, keyB),
  );
  return { lead: lead?.[0], others: rest.length };
}

const andMore = (text: string, others: number) =>
  others === 0 ? text : `${text} y ${others} más`;

// Una línea para la lista de parcelas: la variedad con más árboles, el total y la etapa con más
// árboles, cada una con cuántas otras hay. Por ejemplo, "CCN-51 y 1 más · 2.400 árboles ·
// Producción estable y 1 más". Las tandas de una misma variedad suman sus árboles y siguen siendo
// una sola variedad; las de una misma etapa, igual.
export function characterizationSummary(lines: readonly SummaryLine[]): string {
  const varieties = leadingKey(
    lines.map((line) => ({ key: line.varietyName, trees: line.treeCount })),
    (a, b) => a.localeCompare(b),
  );
  const stages = leadingKey(
    lines.map((line) => ({ key: line.stage, trees: line.treeCount })),
    (a, b) => (STAGE_ORDER.get(a) ?? 0) - (STAGE_ORDER.get(b) ?? 0),
  );
  const trees = totalTrees(lines.map((line) => line.treeCount));
  return [
    varieties.lead
      ? andMore(varieties.lead, varieties.others)
      : 'Sin variedades',
    `${formatCount(trees)} ${trees === 1 ? 'árbol' : 'árboles'}`,
    stages.lead ? andMore(stageLabel(stages.lead), stages.others) : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
