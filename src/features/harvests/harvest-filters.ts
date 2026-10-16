import type { Harvest } from './api';

// Lo que se puede elegir en la lista del mes. Corre en el dispositivo, así que vale igual sin
// conexión, sobre la copia guardada.
export type HarvestFilters = {
  farm?: string;
  plot?: string;
  variety?: string;
  collector?: string;
  // Si ya forma un lote ('with') o todavía no ('without').
  lot?: 'with' | 'without';
};

export const filterHarvests = (
  harvests: readonly Harvest[],
  { farm, plot, variety, collector, lot }: HarvestFilters,
) =>
  harvests.filter(
    (harvest) =>
      (!farm || harvest.plot.farm.id === farm) &&
      (!plot || harvest.plot.id === plot) &&
      (!variety || harvest.variety.id === variety) &&
      (!collector || harvest.collector.id === collector) &&
      (!lot || (lot === 'with') === (harvest.lot !== null)),
  );

// Los pesos llegan con un decimal: se suman en décimas de kilo para no arrastrar los errores de la
// coma flotante (120,5 + 80,3 no es 200,79999…).
const toTenths = (kg: string) => Math.round(Number(kg) * 10);
const fromTenths = (tenths: number) => (tenths / 10).toFixed(1);

const sumKg = (harvests: readonly Harvest[]) =>
  fromTenths(
    harvests.reduce(
      (total, { green_weight_kg }) => total + toTenths(green_weight_kg),
      0,
    ),
  );

// Lo que muestra la lista arriba: el total del mes, lo que falta por conformar en lotes y cuánto
// dio cada variedad, de la que más a la que menos.
export function harvestTotals(harvests: readonly Harvest[]) {
  const withoutLot = harvests.filter(({ lot }) => lot === null);
  const byVariety = new Map<
    string,
    { id: string; name: string; tenths: number }
  >();
  for (const { variety, green_weight_kg } of harvests) {
    const entry = byVariety.get(variety.id) ?? {
      id: variety.id,
      name: variety.name,
      tenths: 0,
    };
    entry.tenths += toTenths(green_weight_kg);
    byVariety.set(variety.id, entry);
  }
  return {
    count: harvests.length,
    kg: sumKg(harvests),
    withoutLot: { count: withoutLot.length, kg: sumKg(withoutLot) },
    byVariety: [...byVariety.values()]
      .toSorted((a, b) => b.tenths - a.tenths)
      .map(({ id, name, tenths }) => ({ id, name, kg: fromTenths(tenths) })),
  };
}
