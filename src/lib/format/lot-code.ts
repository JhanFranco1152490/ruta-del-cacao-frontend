import { formatLongDate } from './dates';

// 000123-F02-P05-261014-1: productor, finca, parcela, fecha de la cosecha (AAMMDD) y consecutivo
// de esa parcela en ese día. Finca y parcela llevan al menos dos cifras; pueden tener más.
const LOT_CODE = /^(\d{6})-(F\d{2,})-(P\d{2,})-(\d{2})(\d{2})(\d{2})-(\d+)$/;

export type LotCodeParts = {
  producer: string;
  farmCode: string;
  plotCode: string;
  harvestDate: string;
  sequence: number;
};

export function parseLotCode(code: string): LotCodeParts | null {
  const match = LOT_CODE.exec(code);
  if (!match) return null;
  const [, producer, farmCode, plotCode, year, month, day, sequence] = match;
  return {
    producer: `PROD-${producer}`,
    farmCode,
    plotCode,
    harvestDate: `20${year}-${month}-${day}`,
    sequence: Number(sequence),
  };
}

const ORDINALS = [
  'Primer',
  'Segundo',
  'Tercer',
  'Cuarto',
  'Quinto',
  'Sexto',
  'Séptimo',
  'Octavo',
  'Noveno',
  'Décimo',
];

const sequenceText = (sequence: number) =>
  sequence <= ORDINALS.length
    ? `${ORDINALS[sequence - 1]} lote de ese día`
    : `Lote ${sequence} de ese día`;

export type LotCodeSegment = {
  value: string;
  label: string;
  // Lo que ese pedazo del código dice hoy: el nombre de la finca, la fecha completa…
  note: string;
};

// El código partido en sus pedazos, cada uno con su nombre y lo que significa: así se lee de un
// vistazo y no hace falta un párrafo que lo explique. El código no cambia aunque cambien los
// nombres de la finca y la parcela; la nota sí los muestra al día.
export function lotCodeSegments(
  code: string,
  names: { farmName?: string | null; plotName?: string | null } = {},
): LotCodeSegment[] | null {
  const parts = parseLotCode(code);
  if (!parts) return null;
  const [producer] = code.split('-');
  const [, , , dateSegment] = code.split('-');
  return [
    { value: producer, label: 'Productor', note: parts.producer },
    {
      value: parts.farmCode,
      label: 'Finca',
      note: names.farmName?.trim() || parts.farmCode,
    },
    {
      value: parts.plotCode,
      label: 'Parcela',
      note: names.plotName?.trim() || parts.plotCode,
    },
    {
      value: dateSegment,
      label: 'Cosecha',
      note: formatLongDate(parts.harvestDate),
    },
    {
      value: String(parts.sequence),
      label: 'Consecutivo',
      note: sequenceText(parts.sequence),
    },
  ];
}
