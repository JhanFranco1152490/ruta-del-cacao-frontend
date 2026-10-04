import type { CacaoVariety, PlotCharacterization } from './api';
import type { SummaryLine } from './characterization-summary';
import type {
  CharacterizationFormFields,
  CharacterizationFormInput,
} from './schemas';
import type { VarietyOption } from './variety-choices';

// La ficha del servidor tal como la llena el formulario: los números como texto y las listas
// opcionales vacías en vez de null.
export const serverToFormInput = (
  characterization: PlotCharacterization,
): CharacterizationFormInput => ({
  varieties: characterization.varieties.map((row) => ({
    variety_id: row.variety.id,
    tree_count: String(row.tree_count),
  })),
  planting_date: characterization.planting_date,
  stage: characterization.stage,
  management_system: characterization.management_system ?? '',
  shade_type: characterization.shade_type ?? '',
});

// La ficha que sigue en la cola, de vuelta al formulario.
export const queuedToFormInput = (
  fields: CharacterizationFormFields,
): CharacterizationFormInput => ({
  varieties: fields.varieties.map((row) => ({
    variety_id: row.variety_id,
    tree_count: String(row.tree_count),
  })),
  planting_date: fields.planting_date,
  stage: fields.stage,
  management_system: fields.management_system ?? '',
  shade_type: fields.shade_type ?? '',
});

// Lo que puede elegir el formulario: las activas del catálogo más las variedades que la ficha ya
// tiene, con el nombre y el estado que trae el servidor. Así una desactivada se muestra con su
// nombre aunque el catálogo guardado solo tenga las activas.
export function varietyOptionsFor(
  active: readonly CacaoVariety[],
  characterization?: PlotCharacterization,
): VarietyOption[] {
  const options = new Map<string, VarietyOption>(
    active.map((variety) => [
      variety.id,
      { id: variety.id, name: variety.name, isActive: variety.is_active },
    ]),
  );
  for (const row of characterization?.varieties ?? []) {
    if (!options.has(row.variety.id)) {
      options.set(row.variety.id, {
        id: row.variety.id,
        name: row.variety.name,
        isActive: row.variety.is_active,
      });
    }
  }
  return [...options.values()];
}

export const serverSummaryLines = (
  characterization: PlotCharacterization,
): SummaryLine[] =>
  characterization.varieties.map((row) => ({
    varietyName: row.variety.name,
    treeCount: row.tree_count,
  }));

// Para una ficha pendiente solo se conocen los ids: el nombre sale del catálogo guardado, o del
// servidor si la ficha ya existía allá.
export function queuedSummaryLines(
  fields: CharacterizationFormFields,
  names: ReadonlyMap<string, string>,
): SummaryLine[] {
  return fields.varieties.map((row) => ({
    varietyName: names.get(row.variety_id) ?? 'Variedad',
    treeCount: row.tree_count,
  }));
}
