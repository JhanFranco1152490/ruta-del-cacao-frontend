type Offered = { id: string; full_name: string; assignable: boolean };
type Current = { id: string; full_name: string; is_active: boolean };

// Los responsables que se ofrecen al iniciar un proceso. Al corregir, el actual se conserva aunque
// ya no pueda serlo (desactivado), marcado, para no perderlo al corregir otra cosa.
export function responsibleOptions(
  responsibles: readonly Offered[],
  current?: Current,
) {
  const offered = responsibles
    .filter(({ assignable }) => assignable)
    .map(({ id, full_name }) => ({ id, label: full_name }));
  if (!current || offered.some(({ id }) => id === current.id)) return offered;
  return [
    ...offered,
    {
      id: current.id,
      label: current.is_active
        ? current.full_name
        : `${current.full_name} (Cuenta inactiva)`,
    },
  ];
}
