import type { CoherenceWarning } from '../characterization-rules';

// Siempre presente, aunque esté vacía: un lector de pantalla solo anuncia los cambios de una
// región que ya existía, y así los avisos se leen sin mover el foco del campo que se edita.
export function CharacterizationWarnings({
  warnings,
}: {
  warnings: readonly CoherenceWarning[];
}) {
  return (
    <div aria-live="polite" role="status">
      {warnings.length > 0 && (
        <div className="space-y-2 rounded-(--radius) bg-warn-bg px-4 py-3">
          <p className="text-sm font-bold text-warn">
            Revisa antes de guardar (puedes guardar igual):
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-warn">
            {warnings.map((warning) => (
              <li key={warning.message}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
