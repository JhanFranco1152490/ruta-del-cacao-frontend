// Una variedad del catálogo, tal como la necesita el formulario.
export type VarietyOption = { id: string; name: string; isActive: boolean };

// `isAvailable`: el servidor la acepta en esta ficha. Una desactivada solo lo está si la ficha
// del servidor ya la tenía.
export type VarietyChoice = VarietyOption & {
  label: string;
  isAvailable: boolean;
};

const UNKNOWN_LABEL = 'Variedad no disponible en este dispositivo';

// Lo que se puede elegir en una fila: las variedades activas y las desactivadas que la ficha del
// servidor ya tenía (`keptIds`), que se conservan al editar el resto. Las que solo traen las filas
// del dispositivo (`presentIds`) y ya no se aceptan se muestran igual, marcadas, para que la
// persona vea cuál cambiar en vez de perderla en silencio.
export function varietyChoices(
  catalog: readonly VarietyOption[],
  keptIds: ReadonlySet<string>,
  presentIds: ReadonlySet<string> = new Set(),
): VarietyChoice[] {
  const byId = new Map(catalog.map((variety) => [variety.id, variety]));
  const known: VarietyChoice[] = catalog
    .filter(
      (variety) =>
        variety.isActive ||
        keptIds.has(variety.id) ||
        presentIds.has(variety.id),
    )
    .map((variety) => {
      const isAvailable = variety.isActive || keptIds.has(variety.id);
      return {
        ...variety,
        isAvailable,
        label: variety.isActive
          ? variety.name
          : `${variety.name} (${isAvailable ? 'desactivada' : 'ya no disponible'})`,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));

  // Al final: sin nombre que mostrar, no tiene un lugar en el orden alfabético.
  const unknown: VarietyChoice[] = [...new Set([...keptIds, ...presentIds])]
    // Una fila todavía sin variedad no conserva nada.
    .filter((id) => id && !byId.has(id))
    .map((id) => ({
      id,
      name: UNKNOWN_LABEL,
      isActive: false,
      isAvailable: keptIds.has(id),
      label: UNKNOWN_LABEL,
    }));
  return [...known, ...unknown];
}
