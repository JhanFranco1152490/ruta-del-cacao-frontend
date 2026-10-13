import { SegmentedControl } from '@/components/segmented-control';

import { ACTIVITY_VIEW_OPTIONS, type ActivityView } from '../activity-view';

// El cambio de vista del calendario. En una pantalla angosta las cinco no caben juntas: se
// desplazan en horizontal en vez de partirse.
export function ActivityViewSwitch({
  value,
  onChange,
}: {
  value: ActivityView;
  onChange: (view: ActivityView) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <SegmentedControl
        label="Vista del calendario"
        onChange={onChange}
        options={ACTIVITY_VIEW_OPTIONS}
        value={value}
      />
    </div>
  );
}
