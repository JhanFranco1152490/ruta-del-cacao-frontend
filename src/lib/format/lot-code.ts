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

// En la lectura el nombre va tras una coma: el punto medio ya separa las partes del código.
const codeAndName = (code: string, name?: string | null) =>
  [code, name?.trim()].filter(Boolean).join(', ');

const sequenceText = (sequence: number) =>
  sequence <= ORDINALS.length
    ? `${ORDINALS[sequence - 1]} lote de ese día`
    : `Lote ${sequence} de ese día`;

// «Cómo se lee este código»: cada parte del código con el nombre que tiene hoy la finca y la
// parcela. El código no cambia aunque cambien los nombres; la lectura sí los muestra al día.
export function readLotCode(
  code: string,
  names: { farmName?: string | null; plotName?: string | null } = {},
): string | null {
  const parts = parseLotCode(code);
  if (!parts) return null;
  return [
    `Productor ${parts.producer}`,
    `Finca ${codeAndName(parts.farmCode, names.farmName)}`,
    `Parcela ${codeAndName(parts.plotCode, names.plotName)}`,
    `Cosecha del ${formatLongDate(parts.harvestDate)}`,
    sequenceText(parts.sequence),
  ].join(' · ');
}
