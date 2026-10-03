import { Button } from '@/components/ui/button';
import { formatHectares } from '@/lib/format/hectares';
import { POLYGON_PROBLEM_MESSAGES } from '@/lib/geo/validate';

import type { PlotCheck } from '../plot-rules';

const hectares = (value: number) => formatHectares(value.toFixed(2));

// Lo que el dispositivo encontró en el polígono y en las áreas. Cada aviso dice qué pasa y, si
// hay, ofrece la corrección; nada se comunica solo con color.
export function PlotNotices({
  check,
  declaredAreaHectares,
  drawing,
  hasVertices,
  onUseMeasuredArea,
  onApplySuggestion,
}: {
  check: PlotCheck;
  declaredAreaHectares: number | null;
  drawing: boolean;
  hasVertices: boolean;
  onUseMeasuredArea: () => void;
  onApplySuggestion: () => void;
}) {
  const measured = check.measuredAreaHectares;
  // Mientras se dibujan los primeros vértices todavía no es un error: solo no se puede guardar.
  const stillDrawing = drawing && check.polygonProblem === 'too_few_vertices';

  return (
    <div className="space-y-3">
      {hasVertices && check.polygonProblem && (
        <p
          className={
            stillDrawing ? 'font-bold text-warn' : 'font-bold text-err'
          }
          role={stillDrawing ? 'status' : 'alert'}
        >
          {stillDrawing
            ? 'Agrega al menos 3 vértices y cierra el polígono, o quita los vértices para guardar sin polígono.'
            : `El polígono no es válido: ${POLYGON_PROBLEM_MESSAGES[check.polygonProblem]}`}
        </p>
      )}

      {check.areaMismatch &&
        measured !== null &&
        declaredAreaHectares !== null && (
          <div
            className="space-y-2 rounded-(--radius) bg-err-bg px-4 py-3"
            role="alert"
          >
            <p className="font-bold text-err">
              El área declarada ({hectares(declaredAreaHectares)}) difiere más
              del 5 % del área dibujada ({hectares(measured)})
            </p>
            <Button
              onClick={onUseMeasuredArea}
              size="office"
              type="button"
              variant="outline"
            >
              Usar área calculada
            </Button>
          </div>
        )}

      {check.areaDifferenceNotice &&
        measured !== null &&
        declaredAreaHectares !== null && (
          <p
            className="rounded-(--radius) bg-warn-bg px-4 py-3 font-bold text-warn"
            role="status"
          >
            El área dibujada ({hectares(measured)}) no coincide con la declarada
            ({hectares(declaredAreaHectares)}). Diferencias menores al 5 % se
            aceptan; queda anotado en el registro.
          </p>
        )}

      {check.overlaps.length > 0 && (
        <div
          className="space-y-2 rounded-(--radius) bg-err-bg px-4 py-3"
          role="alert"
        >
          {check.overlaps.map((overlap) => (
            <p key={overlap.id} className="font-bold text-err">
              El polígono se superpone con la parcela {overlap.code} (
              {hectares(overlap.areaHectares)})
            </p>
          ))}
          {check.suggestion ? (
            <Button
              onClick={onApplySuggestion}
              size="office"
              type="button"
              variant="outline"
            >
              Aplicar ajuste sugerido
            </Button>
          ) : (
            <p className="font-bold text-err">
              No es posible sugerir un ajuste: corrige los vértices
            </p>
          )}
        </div>
      )}
    </div>
  );
}
