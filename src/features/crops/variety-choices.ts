// Una variedad del catálogo, tal como la necesita el formulario.
export type VarietyOption = { id: string; name: string; isActive: boolean };

export type VarietyChoice = VarietyOption & { label: string };

// Lo que se puede elegir en una fila: las variedades activas y, de las desactivadas, solo las que
// la ficha ya tenía (se conservan al editar el resto). Una que la ficha tenía y ya no está en el
// catálogo guardado se ofrece igual, para no perder el dato en silencio.
export function varietyChoices(
  catalog: readonly VarietyOption[],
  keptIds: ReadonlySet<string>,
): VarietyChoice[] {
  const byId = new Map(catalog.map((variety) => [variety.id, variety]));
  const choices: VarietyChoice[] = catalog
    .filter((variety) => variety.isActive || keptIds.has(variety.id))
    .map((variety) => ({
      ...variety,
      label: variety.isActive ? variety.name : `${variety.name} (desactivada)`,
    }));
  for (const id of keptIds) {
    // Una fila todavía sin variedad no conserva nada.
    if (id && !byId.has(id)) {
      choices.push({
        id,
        name: id,
        isActive: false,
        label: 'Variedad no disponible en este dispositivo',
      });
    }
  }
  return choices.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
