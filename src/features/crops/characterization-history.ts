import type { components } from '@/lib/api/schema';
import { formatMonthYear } from '@/lib/format/dates';

import {
  formatCount,
  MANAGEMENT_SYSTEM_OPTIONS,
  propagationLabel,
  SHADE_TYPE_OPTIONS,
} from './characterization-rules';
import { stageLabel } from './characterization-summary';

export type HistorySnapshot =
  components['schemas']['PlotCharacterizationSnapshot'];
type SnapshotPlanting = components['schemas']['SnapshotPlanting'];

const UNSPECIFIED = 'Sin especificar';

const trees = (count: number) =>
  `${formatCount(count)} ${count === 1 ? 'árbol' : 'árboles'}`;

// Una versión guardada con una forma anterior puede no traer siembras: se lee como vacía en vez de
// romper la pantalla.
const plantingsOf = (snapshot: HistorySnapshot): SnapshotPlanting[] =>
  Array.isArray(snapshot.plantings) ? snapshot.plantings : [];

// Una siembra es la variedad en un mes: la misma variedad en otro mes es otra tanda. Se sigue por
// el `id` y no por el nombre, que el catálogo puede cambiar.
const keyOf = (planting: SnapshotPlanting) =>
  `${planting.variety_id}|${planting.planting_date}`;

const labelOf = (planting: SnapshotPlanting) =>
  `${planting.name} (${formatMonthYear(planting.planting_date)})`;

const optionLabel = (
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) =>
  value
    ? (options.find((option) => option.value === value)?.label ?? value)
    : UNSPECIFIED;

const holds = (planting: SnapshotPlanting) =>
  `${trees(planting.tree_count)} · ${propagationLabel(planting.propagation)} · ${stageLabel(planting.stage)}`;

// Lo que tiene una versión: lo que se muestra de la primera, que no tiene anterior con la que
// compararse.
export function describeSnapshot(snapshot: HistorySnapshot): string[] {
  const lines = plantingsOf(snapshot).map(
    (planting) => `${labelOf(planting)}: ${holds(planting)}`,
  );
  if (snapshot.management_system) {
    lines.push(
      `Sistema de manejo: ${optionLabel(MANAGEMENT_SYSTEM_OPTIONS, snapshot.management_system)}`,
    );
  }
  if (snapshot.shade_type) {
    lines.push(
      `Tipo de sombra: ${optionLabel(SHADE_TYPE_OPTIONS, snapshot.shade_type)}`,
    );
  }
  return lines;
}

// Qué cambió entre una versión y la anterior, escrito para leerlo: sobre todo cuándo pasó una
// siembra de una etapa a otra. Vacío si los valores son los mismos.
export function describeChanges(
  previous: HistorySnapshot | null,
  current: HistorySnapshot,
): string[] {
  if (!previous) return describeSnapshot(current);

  const before = new Map(
    plantingsOf(previous).map((planting) => [keyOf(planting), planting]),
  );
  const now = plantingsOf(current);
  const lines: string[] = [];

  for (const planting of now) {
    const old = before.get(keyOf(planting));
    if (!old) {
      lines.push(
        `Se agregó una siembra de ${labelOf(planting)}: ${holds(planting)}`,
      );
      continue;
    }
    if (old.stage !== planting.stage) {
      lines.push(
        `Etapa de ${labelOf(planting)}: ${stageLabel(old.stage)} → ${stageLabel(planting.stage)}`,
      );
    }
    if (old.tree_count !== planting.tree_count) {
      lines.push(
        `Árboles de ${labelOf(planting)}: ${formatCount(old.tree_count)} → ${formatCount(planting.tree_count)}`,
      );
    }
    if (old.propagation !== planting.propagation) {
      lines.push(
        `Propagación de ${labelOf(planting)}: ${propagationLabel(old.propagation)} → ${propagationLabel(planting.propagation)}`,
      );
    }
  }

  const remaining = new Set(now.map(keyOf));
  for (const [key, planting] of before) {
    if (!remaining.has(key)) {
      lines.push(`Se quitó la siembra de ${labelOf(planting)}`);
    }
  }

  if (previous.management_system !== current.management_system) {
    lines.push(
      `Sistema de manejo: ${optionLabel(MANAGEMENT_SYSTEM_OPTIONS, previous.management_system)} → ${optionLabel(MANAGEMENT_SYSTEM_OPTIONS, current.management_system)}`,
    );
  }
  if (previous.shade_type !== current.shade_type) {
    lines.push(
      `Tipo de sombra: ${optionLabel(SHADE_TYPE_OPTIONS, previous.shade_type)} → ${optionLabel(SHADE_TYPE_OPTIONS, current.shade_type)}`,
    );
  }
  return lines;
}
