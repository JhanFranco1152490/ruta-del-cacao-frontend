import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';

import { ScheduleActivityButton } from './schedule-activity-button';

// Lo que se ve cuando el periodo no trae actividades: o no hay ninguna, o los filtros las dejan
// todas fuera. Cada caso ofrece lo que sigue (programar, o quitar los filtros).
export function ActivityEmpty({
  filtered,
  offline,
  onClear,
  onSchedule,
}: {
  filtered: boolean;
  // Programar es solo en línea.
  offline: boolean;
  onClear: () => void;
  // Sin permiso de programar no se pasa.
  onSchedule?: () => void;
}) {
  if (filtered) {
    return (
      <EmptyState
        action={
          <Button onClick={onClear} size="office" variant="outline">
            Limpiar filtros
          </Button>
        }
        description="Prueba con otros filtros o quítalos para ver todas las actividades del periodo."
        title="Ninguna actividad cumple los filtros"
      />
    );
  }
  return (
    <EmptyState
      action={
        onSchedule && (
          <div className="flex justify-center">
            <ScheduleActivityButton offline={offline} onClick={onSchedule} />
          </div>
        )
      }
      description="Las labores que se programen en tus parcelas para este periodo aparecerán aquí."
      title="No hay actividades programadas en este periodo"
    />
  );
}

// Lo mismo en una línea, para cuando el calendario sigue a la vista aunque no tenga nada: una
// cuadrícula vacía dice más que un cartel, y sus días siguen sirviendo para programar.
export function ActivityEmptyNote({
  filtered,
  onClear,
}: {
  filtered: boolean;
  onClear: () => void;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 text-sm font-semibold text-muted-foreground">
      {filtered
        ? 'Ninguna actividad cumple los filtros.'
        : 'No hay actividades programadas en este periodo.'}
      {filtered && (
        <Button onClick={onClear} size="sm" variant="outline">
          Limpiar filtros
        </Button>
      )}
    </p>
  );
}
