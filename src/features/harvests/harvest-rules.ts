import { z } from 'zod';

import type { components } from '@/lib/api/schema';
import { formatMonthYear, isIsoDate } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';
import { formatHectares } from '@/lib/format/hectares';
import { decimalPattern, isDecimal } from '@/lib/validation/decimal';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

type Schemas = components['schemas'];
type Planting = Schemas['Planting'];
export type HarvestCreateRequest = Schemas['HarvestCreateRequest'];

// Un tope físico para atrapar un error de digitación (un cero de más), no una cosecha real: una
// finca muy productiva da del orden de 5.000 kg de cacao en baba por hectárea en todo el año,
// repartidos en muchas recolecciones. El servidor aplica el mismo valor.
export const MAX_KG_PER_HECTARE = 2000;
const WEIGHT_DECIMALS = 1;

export const FUTURE_DATE_MESSAGE = 'La fecha no puede ser futura';
export const WEIGHT_NOT_POSITIVE_MESSAGE = 'El peso debe ser mayor a 0';

// Una variedad de las siembras de la parcela, tal como se ofrece al registrar una cosecha.
export type VarietyChoice = {
  id: string;
  name: string;
  isActive: boolean;
  // Los años de sus siembras, sin repetir y en orden.
  years: string[];
  // La siembra más antigua (yyyy-MM) y su primer día: no hay cosecha anterior a ella.
  earliestMonth: string;
  earliestDate: string;
  // Todas sus siembras siguen en establecimiento (sembradas, sin producir): se avisa, sin impedirlo,
  // porque la etapa la escribe una persona y puede ir atrasada.
  onlyEstablishment: boolean;
};

export function varietiesOfPlot(
  plantings: readonly Planting[],
): VarietyChoice[] {
  const byVariety = new Map<string, Planting[]>();
  for (const planting of plantings) {
    const list = byVariety.get(planting.variety.id) ?? [];
    list.push(planting);
    byVariety.set(planting.variety.id, list);
  }
  return [...byVariety.values()]
    .map((list): VarietyChoice => {
      const months = list.map(({ planting_date }) => planting_date).toSorted();
      const [{ variety }] = list;
      return {
        id: variety.id,
        name: variety.name,
        isActive: variety.is_active,
        years: [...new Set(months.map((month) => month.slice(0, 4)))],
        earliestMonth: months[0],
        earliestDate: `${months[0]}-01`,
        onlyEstablishment: list.every(({ stage }) => stage === 'establishment'),
      };
    })
    .toSorted((a, b) => a.name.localeCompare(b.name, 'es'));
}

const listOf = (items: readonly string[]) =>
  items.length === 1
    ? items[0]
    : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

export const varietyLabel = ({ name, years }: VarietyChoice) =>
  `${name} · ${years.length === 1 ? 'siembra' : 'siembras'} de ${listOf(years)}`;

// Sin ficha o sin siembras no hay variedad que elegir: la parcela no se cosecha todavía.
export const canHarvest = (
  characterization: { plantings: readonly Planting[] } | null | undefined,
) => (characterization?.plantings.length ?? 0) > 0;

export const weightLimitKg = (areaHectares: string) =>
  Math.round(Number(areaHectares) * MAX_KG_PER_HECTARE * 10) / 10;

function weightError(weight: string, areaHectares: string): string | null {
  if (!isDecimal(weight)) return 'Escribe un peso válido.';
  if (Number(weight) <= 0) return WEIGHT_NOT_POSITIVE_MESSAGE;
  if (!decimalPattern(WEIGHT_DECIMALS).test(weight)) {
    return `Usa máximo ${WEIGHT_DECIMALS} decimal.`;
  }
  const limit = weightLimitKg(areaHectares);
  return Number(weight) > limit
    ? `El peso supera lo que puede dar una parcela de ${formatHectares(areaHectares)} en una recolección (${formatDecimal(limit, WEIGHT_DECIMALS)} kg). Revisa la cifra.`
    : null;
}

// Todo lo que el servidor va a comprobar, para decirlo junto al campo antes de guardar (también
// sin conexión). `today` es la fecha de Bogotá; `areaHectares` y `varieties` son los de la
// parcela elegida (sin parcela, el campo de parcela ya dice que falta).
export const createHarvestSchema = ({
  today,
  areaHectares,
  varieties,
}: {
  today: string;
  areaHectares: string;
  varieties: readonly VarietyChoice[];
}) =>
  z
    .object({
      plot_id: z.string().min(1, REQUIRED_FIELD_MESSAGE),
      harvest_date: z.string().trim().min(1, REQUIRED_FIELD_MESSAGE),
      green_weight_kg: z
        .string()
        .trim()
        .min(1, REQUIRED_FIELD_MESSAGE)
        .transform((value) => value.replace(',', '.')),
      variety_id: z.string().min(1, REQUIRED_FIELD_MESSAGE),
      collector_id: z.string().min(1, REQUIRED_FIELD_MESSAGE),
    })
    .superRefine(({ harvest_date, green_weight_kg, variety_id }, context) => {
      const issue = (path: string, message: string) =>
        context.addIssue({ code: 'custom', path: [path], message });

      const variety = varieties.find(({ id }) => id === variety_id);
      if (variety_id && !variety) {
        issue(
          'variety_id',
          'Elige una variedad de las siembras de la parcela.',
        );
      }
      if (harvest_date) {
        if (!isIsoDate(harvest_date)) {
          issue('harvest_date', 'Escribe una fecha válida.');
        } else if (harvest_date > today) {
          issue('harvest_date', FUTURE_DATE_MESSAGE);
        } else if (variety && harvest_date < variety.earliestDate) {
          issue(
            'harvest_date',
            `La fecha es anterior a la siembra de ${variety.name} en esta parcela (${formatMonthYear(variety.earliestMonth)})`,
          );
        }
      }
      if (green_weight_kg) {
        const error = weightError(green_weight_kg, areaHectares);
        if (error) issue('green_weight_kg', error);
      }
    });

export type HarvestFormValues = z.output<
  ReturnType<typeof createHarvestSchema>
>;

export const toHarvestRequest = (
  values: HarvestFormValues,
  id: string,
): HarvestCreateRequest & { id: string } => ({
  id,
  plot_id: values.plot_id,
  harvest_date: values.harvest_date,
  green_weight_kg: values.green_weight_kg,
  variety_id: values.variety_id,
  collector_id: values.collector_id,
});

type ServerHarvest = Schemas['Harvest'];

// Los valores del formulario a partir de una cosecha del servidor, para corregirla.
export const harvestToFormValues = (
  harvest: ServerHarvest,
): HarvestFormValues => ({
  plot_id: harvest.plot.id,
  harvest_date: harvest.harvest_date,
  green_weight_kg: harvest.green_weight_kg,
  variety_id: harvest.variety.id,
  collector_id: harvest.collector.id,
});

// Solo lo que cambió, con la versión leída: el servidor valida la variedad y el recolector solo si
// cambian, y así una cosecha cuyo recolector dejó de cumplir se corrige en el peso sin tocarlo. La
// parcela no se cambia. El peso se compara como número ("120.50" y "120.5" son el mismo).
export function toHarvestUpdate(
  values: HarvestFormValues,
  harvest: ServerHarvest,
): Schemas['PatchedHarvestUpdateRequest'] {
  const current = harvestToFormValues(harvest);
  return {
    expected_version: harvest.version,
    ...(values.harvest_date !== current.harvest_date && {
      harvest_date: values.harvest_date,
    }),
    ...(Number(values.green_weight_kg) !== Number(current.green_weight_kg) && {
      green_weight_kg: values.green_weight_kg,
    }),
    ...(values.variety_id !== current.variety_id && {
      variety_id: values.variety_id,
    }),
    ...(values.collector_id !== current.collector_id && {
      collector_id: values.collector_id,
    }),
  };
}
