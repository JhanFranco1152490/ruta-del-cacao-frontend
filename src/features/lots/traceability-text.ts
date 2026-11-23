import {
  formatDayMonth,
  formatDayRange,
  formatLongDate,
} from '@/lib/format/dates';
import { formatFixedDecimal } from '@/lib/format/decimal';

import type { PublicStage, PublicTraceability } from './public-traceability';

const TITLES: Record<PublicStage['kind'], string> = {
  harvest: 'Cosecha',
  fermentation: 'Fermentación',
  drying: 'Secado',
  evaluation: 'Evaluación de calidad',
  classification: 'Clasificación',
  stock_entry: 'Ingreso a bodega',
};

export const publicStageTitle = (stage: PublicStage) => TITLES[stage.kind];

// Lo que dice cada etapa para quien no conoce la app: su fecha, o sus días y el periodo.
export function publicStageDetail(stage: PublicStage) {
  if ('date' in stage) return formatLongDate(stage.date);
  if (stage.ended_on === null) {
    return `En curso desde el ${formatDayMonth(stage.started_on)}`;
  }
  const days = `${stage.days} ${stage.days === 1 ? 'día' : 'días'}`;
  return `${days}, ${formatDayRange(stage.started_on, stage.ended_on)}`;
}

export const percentText = (value: string) =>
  `${formatFixedDecimal(value, 1)} %`;

// G1 y G2 solos no dicen nada a quien escanea el saco.
export const GRADE_NOTES = {
  g1: 'Grano grande, primera calidad',
  g2: 'Grano más pequeño, segunda calidad',
  discard: 'Grano que no cumple el estándar',
} as const;

export const traceabilityHeadline = (origin: PublicTraceability['origin']) =>
  `${origin.variety} de ${origin.municipality}`;

type DatedStage = Extract<PublicStage, { date: string }>;
type SpanStage = Extract<PublicStage, { days: number }>;

const datedStage = (stages: PublicStage[], kind: DatedStage['kind']) =>
  stages.find(
    (stage): stage is DatedStage => 'date' in stage && stage.kind === kind,
  );

const spanStage = (stages: PublicStage[], kind: SpanStage['kind']) =>
  stages.find(
    (stage): stage is SpanStage => 'days' in stage && stage.kind === kind,
  );

// La frase con la que abre la página: qué cacao es, de dónde viene y cuándo se cosechó y se guardó.
export function traceabilitySummary({ origin, stages }: PublicTraceability) {
  const place = `${origin.municipality} (${origin.department})`;
  const what = `Cacao ${origin.variety} de la finca ${origin.farm}, ${place}.`;
  const harvest = datedStage(stages, 'harvest');
  const stored = datedStage(stages, 'stock_entry');
  const classified = datedStage(stages, 'classification');
  const parts = [
    harvest && `Cosechado el ${formatLongDate(harvest.date)}`,
    stored
      ? `en bodega desde el ${formatLongDate(stored.date)}`
      : classified && `clasificado el ${formatLongDate(classified.date)}`,
  ].filter(Boolean);
  return parts.length === 0 ? what : `${what} ${parts.join(' y ')}.`;
}

export type TraceabilityFigure = {
  key: 'fermentation' | 'drying' | 'well_fermented' | 'first_grade';
  label: string;
  value: string;
};

const NO_DATA = '—';

const daysText = (days: number) => `${days} ${days === 1 ? 'día' : 'días'}`;

// Las cuatro cifras que se leen de un vistazo. Siempre son cuatro: lo que el lote no tiene se dice
// con un guion, para que la franja no quede con un hueco.
export function traceabilityFigures({
  stages,
  quality,
}: PublicTraceability): TraceabilityFigure[] {
  const fermentation = spanStage(stages, 'fermentation');
  const drying = spanStage(stages, 'drying');
  return [
    {
      key: 'fermentation',
      label: 'Fermentación',
      value: fermentation ? daysText(fermentation.days) : NO_DATA,
    },
    {
      key: 'drying',
      label: 'Secado',
      value: drying ? daysText(drying.days) : NO_DATA,
    },
    {
      key: 'well_fermented',
      label: 'Bien fermentados',
      value: percentText(quality.well_fermented_pct),
    },
    {
      key: 'first_grade',
      label: 'Primera calidad (G1)',
      value: quality.g1_pct === null ? NO_DATA : percentText(quality.g1_pct),
    },
  ];
}

export type GradeShare = {
  key: keyof typeof GRADE_NOTES;
  label: string;
  note: string;
  value: number;
  text: string;
};

// El reparto del cacao seco por calibre, en el orden de la barra. Lo que es cero o no se conoce no
// entra: una franja vacía en la barra y un «0,0 %» en la leyenda parecen un defecto.
export function gradeShares(quality: PublicTraceability['quality']) {
  const grades = [
    ['g1', 'G1', quality.g1_pct],
    ['g2', 'G2', quality.g2_pct],
    ['discard', 'Descarte', quality.discard_pct],
  ] as const;
  return grades.flatMap(([key, label, pct]): GradeShare[] =>
    pct === null || Number(pct) === 0
      ? []
      : [
          {
            key,
            label,
            note: GRADE_NOTES[key],
            value: Number(pct),
            text: percentText(pct),
          },
        ],
  );
}
