'use client';

import { useEffect, useRef } from 'react';

import { SegmentedControl } from '@/components/segmented-control';

import { ACTIVITY_VIEW_OPTIONS, type ActivityView } from '../activity-view';

// El cambio de vista del calendario. En una pantalla angosta las cinco no caben juntas: se
// desplazan en horizontal, llegan hasta el borde y se desvanecen en él para que se vea que hay más a la derecha, y la
// vista elegida se trae a la vista (con `?vista=pendientes` la última no queda escondida).
export function ActivityViewSwitch({
  value,
  onChange,
}: {
  value: ActivityView;
  onChange: (view: ActivityView) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [value]);

  return (
    <div
      className="-mx-4 max-w-[100vw] overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)] px-4 sm:mx-0 sm:max-w-full sm:[mask-image:none] sm:px-0"
      ref={scroller}
    >
      <SegmentedControl
        label="Vista del calendario"
        onChange={onChange}
        options={ACTIVITY_VIEW_OPTIONS}
        value={value}
      />
    </div>
  );
}
