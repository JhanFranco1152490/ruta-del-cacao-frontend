'use client';

import { useState } from 'react';

import { ShareBar } from '@/components/charts/share-bar';
import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { SectionCard } from '@/components/page-blocks/section-card';
import { SegmentedControl } from '@/components/segmented-control';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMunicipalityName } from '@/lib/api/municipalities';

import type { AssociationFarm, QualitySplit } from '../api';
import { KG_COLORS, qualitySegments } from '../indicator-charts';
import { formatKg } from '../indicator-format';
import { farmsByProducer } from '../indicator-groups';

type Grouping = 'farm' | 'producer';

const GROUPING_OPTIONS: readonly { value: Grouping; label: string }[] = [
  { value: 'farm', label: 'Por finca' },
  { value: 'producer', label: 'Por productor' },
];

type Row = QualitySplit & {
  key: string;
  title: string;
  subtitle: string;
  green_kg: string;
  sold_kg: string;
};

// Cada fila es una finca o, agrupadas, un productor con la suma de las suyas. Siempre de quien más
// produjo a quien menos, con la barra de lo producido, su calidad y lo vendido.
export function AssociationFarmsSection({
  farms,
}: {
  farms: readonly AssociationFarm[];
}) {
  const municipalityName = useMunicipalityName();
  const [grouping, setGrouping] = useState<Grouping>('farm');
  const rows: Row[] =
    grouping === 'farm'
      ? farms.map((farm) => ({
          ...farm,
          key: farm.farm_id,
          title: `${farm.farm_code} · ${farm.farm_name}`,
          subtitle: `${farm.producer.first_name} ${farm.producer.last_name} · ${municipalityName(farm.municipality_code)}`,
        }))
      : farmsByProducer(farms).map((producer) => ({
          ...producer,
          key: producer.producerId,
          title: producer.name,
          subtitle: `${producer.memberCode} · ${producer.farms} ${producer.farms === 1 ? 'finca' : 'fincas'}`,
        }));
  const max = Math.max(1, ...rows.map(({ green_kg }) => Number(green_kg)));
  const label = grouping === 'farm' ? 'Fincas' : 'Productores';
  return (
    <SectionCard
      accent="cobre"
      actions={
        <SegmentedControl
          compact
          label="Agrupar"
          onChange={setGrouping}
          options={GROUPING_OPTIONS}
          value={grouping}
        />
      }
      collapsible
      count={rows.length}
      title={label}
    >
      <Table aria-label={label} className={COMPACT_TABLE_CLASS}>
        <TableHeader>
          <TableRow>
            <TableHead>{grouping === 'farm' ? 'Finca' : 'Productor'}</TableHead>
            <TableHead>En baba</TableHead>
            <TableHead>Calidad</TableHead>
            <TableHead className="text-right">Vendido</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.key}>
              <TableCell>
                <span className="mr-2 font-serif text-lg text-cobre">
                  {index + 1}
                </span>
                <span className="font-semibold">{row.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {row.subtitle}
                </span>
              </TableCell>
              <TableCell className="min-w-40">
                <span className="font-bold text-selva tabular-nums">
                  {formatKg(row.green_kg)}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1 block h-2 overflow-hidden rounded-full bg-muted"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      backgroundColor: KG_COLORS.green,
                      width: `${(Number(row.green_kg) / max) * 100}%`,
                    }}
                  />
                </span>
              </TableCell>
              <TableCell className="min-w-44">
                {Number(row.classified_kg) > 0 ? (
                  <ShareBar
                    compact
                    label={`Calidad de ${row.title}`}
                    segments={qualitySegments(row)}
                  />
                ) : (
                  <span className="text-muted-foreground">Sin clasificar</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums max-md:text-left">
                <span className="text-muted-foreground md:hidden">
                  Vendido:{' '}
                </span>
                {formatKg(row.sold_kg)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  );
}
