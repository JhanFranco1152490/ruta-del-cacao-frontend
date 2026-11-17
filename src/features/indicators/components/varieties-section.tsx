import { ShareBar } from '@/components/charts/share-bar';
import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { SectionCard } from '@/components/page-blocks/section-card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { QualitySplit } from '../api';
import { qualitySegments } from '../indicator-charts';
import { formatKg } from '../indicator-format';

export type VarietyFigures = QualitySplit & {
  variety_id: string;
  variety_name: string;
  green_kg: string;
  dry_kg: string;
};

// Lo que dio cada variedad de cacao en el periodo: kilos en baba y secos y cómo salió su calidad. Es
// de las cosechas de las fincas que cuenta el panel, así que sirve igual al productor y a la
// asociación.
export function VarietiesSection({
  varieties,
}: {
  varieties: readonly VarietyFigures[];
}) {
  return (
    <SectionCard
      accent="cobre"
      collapsible
      count={varieties.length}
      title="Variedades de cacao"
    >
      {varieties.length > 0 ? (
        <Table aria-label="Variedades de cacao" className={COMPACT_TABLE_CLASS}>
          <TableHeader>
            <TableRow>
              <TableHead>Variedad</TableHead>
              <TableHead className="text-right">En baba</TableHead>
              <TableHead className="text-right">Seco</TableHead>
              <TableHead>Calidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {varieties.map((variety) => (
              <TableRow key={variety.variety_id}>
                <TableCell className="font-semibold">
                  {variety.variety_name}
                </TableCell>
                <TableCell className="text-right tabular-nums max-md:text-left">
                  <span className="text-muted-foreground md:hidden">
                    En baba:{' '}
                  </span>
                  {formatKg(variety.green_kg)}
                </TableCell>
                <TableCell className="text-right tabular-nums max-md:text-left">
                  <span className="text-muted-foreground md:hidden">
                    Seco:{' '}
                  </span>
                  {formatKg(variety.dry_kg)}
                </TableCell>
                <TableCell className="min-w-44">
                  {Number(variety.classified_kg) > 0 ? (
                    <ShareBar
                      compact
                      label={`Calidad de ${variety.variety_name}`}
                      segments={qualitySegments(variety)}
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      Sin clasificar
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground">
          No hay cosechas ni calidad por variedad en el periodo.
        </p>
      )}
    </SectionCard>
  );
}
