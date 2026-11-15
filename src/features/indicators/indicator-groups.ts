import type { AssociationFarm, QualitySplit } from './api';

// Las fincas de un mismo productor sumadas en una sola fila, para ver la asociación por productor y no
// por finca.
export type ProducerRow = QualitySplit & {
  producerId: string;
  name: string;
  memberCode: string;
  farms: number;
  green_kg: string;
  dry_kg: string;
  sold_kg: string;
};

// Sumas en décimas enteras: sumar «0.1» varias veces con flotantes arrastra errores de coma.
const tenths = (value: string) => Math.round(Number(value) * 10);
const asKg = (value: number) => (value / 10).toFixed(1);
// Cada porcentaje se redondea por su lado, como lo hace el servidor.
const share = (part: number, total: number) =>
  total === 0 ? null : (Math.round((part * 1000) / total) / 10).toFixed(1);

// De quien más produjo a quien menos, por kilos en baba y, a igualdad, por nombre.
export function farmsByProducer(
  farms: readonly AssociationFarm[],
): ProducerRow[] {
  const sums = new Map<
    string,
    {
      row: Pick<ProducerRow, 'producerId' | 'name' | 'memberCode' | 'farms'>;
      green: number;
      dry: number;
      sold: number;
      g1: number;
      g2: number;
      discard: number;
    }
  >();
  for (const farm of farms) {
    const { producer } = farm;
    const sum = sums.get(producer.id) ?? {
      row: {
        producerId: producer.id,
        name: `${producer.first_name} ${producer.last_name}`,
        memberCode: producer.member_code,
        farms: 0,
      },
      green: 0,
      dry: 0,
      sold: 0,
      g1: 0,
      g2: 0,
      discard: 0,
    };
    sum.row.farms += 1;
    sum.green += tenths(farm.green_kg);
    sum.dry += tenths(farm.dry_kg);
    sum.sold += tenths(farm.sold_kg);
    sum.g1 += tenths(farm.g1_kg);
    sum.g2 += tenths(farm.g2_kg);
    sum.discard += tenths(farm.discard_kg);
    sums.set(producer.id, sum);
  }
  return [...sums.values()]
    .sort(
      (a, b) => b.green - a.green || a.row.name.localeCompare(b.row.name, 'es'),
    )
    .map(({ row, green, dry, sold, g1, g2, discard }) => {
      const classified = g1 + g2 + discard;
      return {
        ...row,
        green_kg: asKg(green),
        dry_kg: asKg(dry),
        sold_kg: asKg(sold),
        classified_kg: asKg(classified),
        g1_kg: asKg(g1),
        g2_kg: asKg(g2),
        discard_kg: asKg(discard),
        g1_pct: share(g1, classified),
        g2_pct: share(g2, classified),
        discard_pct: share(discard, classified),
      };
    });
}
