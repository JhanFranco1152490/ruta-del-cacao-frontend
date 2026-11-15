import type { FunnelStep } from '@/components/charts/funnel';

import type { ProducerIndicators } from './api';
import { GRADE_COLORS, KG_COLORS, qualitySegments } from './indicator-charts';
import { formatKg } from './indicator-format';

// Los pasos del cacao del árbol a la venta con lo que hay en cada uno: lo cosechado en baba, lo que
// ya se secó, lo clasificado (repartido en sus calibres), lo que hay hoy en bodega y lo vendido.
// Los periodos no son los mismos (las existencias son de hoy), así que no se afirma que un paso salga
// del anterior: solo se muestran uno al lado del otro.
export function funnelSteps(data: ProducerIndicators): FunnelStep[] {
  const { production, quality, inventory, sales } = data;
  const dryShare =
    Number(production.green_kg) > 0
      ? Math.round(
          (Number(production.dry_kg) / Number(production.green_kg)) * 100,
        )
      : null;
  return [
    {
      key: 'green',
      label: 'En baba',
      kg: Number(production.green_kg),
      valueLabel: formatKg(production.green_kg),
      note: 'cosechado',
      color: KG_COLORS.green,
    },
    {
      key: 'dry',
      label: 'Seco',
      kg: Number(production.dry_kg),
      valueLabel: formatKg(production.dry_kg),
      note: dryShare === null ? 'sin cosecha' : `${dryShare} % del baba`,
      color: KG_COLORS.dry,
    },
    {
      key: 'classified',
      label: 'Clasificado',
      kg: Number(quality.classified_kg),
      valueLabel: formatKg(quality.classified_kg),
      note: 'G1, G2 y descarte',
      color: GRADE_COLORS.g1,
      parts: qualitySegments(quality).map(({ key, label, color }, index) => ({
        key,
        label,
        kg: Number([quality.g1_kg, quality.g2_kg, quality.discard_kg][index]),
        color,
      })),
    },
    {
      key: 'stock',
      label: 'En bodega',
      kg: Number(inventory.total_kg),
      valueLabel: formatKg(inventory.total_kg),
      note: 'hoy',
      color: KG_COLORS.dry,
    },
    {
      key: 'sold',
      label: 'Vendido',
      kg: Number(sales.sold_kg),
      valueLabel: formatKg(sales.sold_kg),
      note: `${sales.sales} ${sales.sales === 1 ? 'venta' : 'ventas'}`,
      color: KG_COLORS.sold,
    },
  ];
}
