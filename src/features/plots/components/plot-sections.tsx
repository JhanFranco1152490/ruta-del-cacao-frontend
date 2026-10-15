import { cn } from 'cn';
import { CloudUpload, MapPin, UserRound } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { OverviewPlot } from '../plot-overview';
import type { PlotSection, SectionHeader } from '../plot-groups';

const ICONS = {
  device: CloudUpload,
  producer: UserRound,
  farm: MapPin,
} as const;

function GroupHeading({
  header,
  farmHref,
}: {
  header: SectionHeader;
  farmHref?: (farmId: string) => string;
}) {
  const Icon = ICONS[header.level];
  return (
    <h2
      className={cn(
        'flex items-center gap-2 text-selva',
        header.level === 'farm' ? 'text-lg' : 'text-xl',
      )}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0 text-cobre" />
      {header.farmId && farmHref ? (
        <Link
          className="underline-offset-4 hover:underline"
          href={farmHref(header.farmId)}
        >
          {header.label}
        </Link>
      ) : (
        header.label
      )}
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
  farmHref,
  renderList,
}: {
  sections: readonly PlotSection[];
  // Con él, el nombre de la finca en su encabezado lleva a su detalle.
  farmHref?: (farmId: string) => string;
  renderList: (plots: readonly OverviewPlot[]) => ReactNode;
}) {
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section className="space-y-2" key={section.key}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {section.headers.map((header) => (
              <GroupHeading
                farmHref={farmHref}
                header={header}
                key={header.level}
              />
            ))}
          </div>
          {renderList(section.plots)}
        </section>
      ))}
    </div>
  );
}
