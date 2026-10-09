import { cn } from 'cn';
import { CloudUpload, MapPin, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';

import type { OverviewPlot } from '../plot-overview';
import type { PlotSection, SectionHeader } from '../plot-groups';

const ICONS = {
  device: CloudUpload,
  producer: UserRound,
  farm: MapPin,
} as const;

function GroupHeading({ header }: { header: SectionHeader }) {
  const Icon = ICONS[header.level];
  return (
    <h2
      className={cn(
        'flex items-center gap-2 text-selva',
        header.level === 'farm' ? 'text-lg' : 'text-xl',
      )}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0 text-cobre" />
      {header.label}
      {header.continues && (
        <span className="text-sm font-bold text-muted-foreground">
          (continúa)
        </span>
      )}
    </h2>
  );
}

// Los grupos de la página, cada uno con sus encabezados y su lista de tarjetas.
export function PlotSections({
  sections,
  renderList,
}: {
  sections: readonly PlotSection[];
  renderList: (plots: readonly OverviewPlot[]) => ReactNode;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section className="space-y-3" key={section.key}>
          {section.headers.map((header) => (
            <GroupHeading header={header} key={header.level} />
          ))}
          {renderList(section.plots)}
        </section>
      ))}
    </div>
  );
}
