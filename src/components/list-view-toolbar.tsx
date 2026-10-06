import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/segmented-control';
import type { ListView } from '@/lib/list-view';

const VIEW_OPTIONS = [
  { value: 'lista', label: 'Lista' },
  { value: 'agrupada', label: 'Por productor' },
] as const;

// Una sola línea sobre la lista: cuántos hay y qué falta elegir, a la izquierda; a la derecha,
// la vista (solo para quien ve varios productores) y plegar o desplegar los grupos.
export function ListViewToolbar({
  count,
  hint,
  view,
  onViewChange,
  groups,
}: {
  count: string;
  hint?: ReactNode;
  view?: ListView;
  onViewChange?: (view: ListView) => void;
  groups?: { allOpen: boolean; toggleAll: () => void };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <p role="status">{count}</p>
        {hint && <p>{hint}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {view === 'agrupada' && groups && (
          <Button variant="outline" onClick={groups.toggleAll}>
            {groups.allOpen ? 'Plegar todo' : 'Desplegar todo'}
          </Button>
        )}
        {view && onViewChange && (
          <SegmentedControl
            label="Vista de la lista"
            options={VIEW_OPTIONS}
            value={view}
            onChange={onViewChange}
          />
        )}
      </div>
    </div>
  );
}
