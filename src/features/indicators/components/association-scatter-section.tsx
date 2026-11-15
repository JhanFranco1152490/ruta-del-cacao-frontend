'use client';

import { useState } from 'react';

import { ScatterChart } from '@/components/charts/scatter-chart';
import { SectionCard } from '@/components/page-blocks/section-card';
import { SegmentedControl } from '@/components/segmented-control';
import { formatDecimal } from '@/lib/format/decimal';

import type { AssociationIndicators } from '../api';
import { formatKg } from '../indicator-format';
import {
  SCATTER_BY_OPTIONS,
  SCATTER_X_OPTIONS,
  SCATTER_Y_OPTIONS,
  type ScatterBy,
  type ScatterX,
  type ScatterY,
  farmSources,
  scatterAverages,
  scatterPoints,
  varietySources,
} from '../indicator-scatter';

// Cada finca o cada variedad es un punto según sus kilos y un porcentaje de su calidad, con lo vendido
// como tamaño. Las líneas del promedio reparten el plano: con G1, arriba a la derecha es mucho y
// bueno, y abajo a la izquierda lo que hay que acompañar. Los tres controles cambian qué se compara.
export function AssociationScatterSection({
  data,
}: {
  data: AssociationIndicators;
}) {
  const [by, setBy] = useState<ScatterBy>('farm');
  const [x, setX] = useState<ScatterX>('green');
  const [y, setY] = useState<ScatterY>('g1');
  // Una variedad no tiene ventas: al compararlas no se ofrece, y si estaba elegida se vuelve a baba.
  const xOptions =
    by === 'variety'
      ? SCATTER_X_OPTIONS.filter(({ value }) => value !== 'sold')
      : SCATTER_X_OPTIONS;
  const effectiveX = by === 'variety' && x === 'sold' ? 'green' : x;
  const sources =
    by === 'farm' ? farmSources(data.farms) : varietySources(data.varieties);
  const { points, unclassified } = scatterPoints(sources, effectiveX, y);
  const average = scatterAverages(sources, data.totals, effectiveX, y);
  const xAxis = SCATTER_X_OPTIONS.find(({ value }) => value === effectiveX)!;
  const yAxis = SCATTER_Y_OPTIONS.find(({ value }) => value === y)!;
  const subject = by === 'farm' ? 'finca' : 'variedad';
  return (
    <SectionCard
      accent="cobre"
      actions={
        <>
          <SegmentedControl
            compact
            label="Comparar"
            onChange={setBy}
            options={SCATTER_BY_OPTIONS}
            value={by}
          />
          <SegmentedControl
            compact
            label="Kilos"
            onChange={setX}
            options={xOptions}
            value={effectiveX}
          />
          <SegmentedControl
            compact
            label="Calidad"
            onChange={setY}
            options={SCATTER_Y_OPTIONS}
            value={y}
          />
        </>
      }
      collapsible
      title="Kilos y calidad"
    >
      {points.length > 0 ? (
        <ScatterChart
          averageX={average.x}
          averageY={average.y}
          formatX={(value) => formatKg(value.toFixed(1))}
          formatY={(value) => `${formatDecimal(value, 1)} %`}
          label={`${xAxis.axis} y ${yAxis.axis} por ${subject}`}
          points={points}
          xLabel={xAxis.axis}
          yLabel={yAxis.axis}
        />
      ) : (
        <p className="text-muted-foreground">
          {by === 'farm'
            ? 'Ninguna finca clasificó cacao en el periodo.'
            : 'Ninguna variedad clasificó cacao en el periodo.'}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {by === 'farm'
          ? 'El tamaño del punto son los kilos vendidos'
          : 'El tamaño del punto son los kilos clasificados'}
        ; en rojo, lo que tiene 10 % o más de descarte. Las líneas punteadas son
        el promedio.
        {unclassified.length > 0 &&
          ` Sin clasificar en el periodo: ${unclassified.map(({ label }) => label).join(', ')}.`}
      </p>
    </SectionCard>
  );
}
