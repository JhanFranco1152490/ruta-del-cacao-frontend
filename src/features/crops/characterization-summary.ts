import {
  formatCount,
  type Stage,
  STAGE_OPTIONS,
  totalTrees,
} from './characterization-rules';

export type SummaryLine = { varietyName: string; treeCount: number };

export const stageLabel = (stage: Stage) =>
  STAGE_OPTIONS.find((option) => option.value === stage)?.label ?? stage;

// Una línea para la lista de parcelas: la variedad con más árboles, cuántas más hay, el total y la
// etapa. Por ejemplo, "CCN-51 y 1 más · 2.400 árboles · Producción estable".
export function characterizationSummary(
  lines: readonly SummaryLine[],
  stage: Stage,
): string {
  // Las tandas de una misma variedad suman sus árboles: siguen siendo una sola variedad.
  const byVariety = new Map<string, number>();
  for (const line of lines) {
    byVariety.set(
      line.varietyName,
      (byVariety.get(line.varietyName) ?? 0) + line.treeCount,
    );
  }
  const [main, ...others] = [...byVariety]
    .map(([varietyName, treeCount]) => ({ varietyName, treeCount }))
    .sort(
      (a, b) =>
        b.treeCount - a.treeCount || a.varietyName.localeCompare(b.varietyName),
    );
  const varieties = !main
    ? 'Sin variedades'
    : others.length === 0
      ? main.varietyName
      : `${main.varietyName} y ${others.length} más`;
  const trees = totalTrees(lines.map((line) => line.treeCount));
  const treesText = `${formatCount(trees)} ${trees === 1 ? 'árbol' : 'árboles'}`;
  return [varieties, treesText, stageLabel(stage)].join(' · ');
}
