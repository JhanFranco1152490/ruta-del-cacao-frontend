// Cuántas de las parcelas filtradas, de todas las páginas, ya tienen ficha. Los números no
// dependen del filtro de caracterización: con "Sin caracterizar" puesto siguen diciendo cuántas
// faltan de todas.
export function PlotCharacterizationProgress({
  done,
  pending,
}: {
  done: number;
  pending: number;
}) {
  const total = done + pending;
  if (total === 0) return null;
  return (
    <p className="font-bold text-selva" role="status">
      Caracterizadas: {done} de {total} {total === 1 ? 'parcela' : 'parcelas'}.
    </p>
  );
}
