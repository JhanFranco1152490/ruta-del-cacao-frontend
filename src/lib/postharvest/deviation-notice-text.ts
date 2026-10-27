import type { components } from '@/lib/api/schema';
import { formatFixedDecimal } from '@/lib/format/decimal';

import {
  isPostharvestAlertKind,
  POSTHARVEST_ALERT_TITLES,
  type PostharvestAlertKind,
} from './alert-kinds';
import { moistureText, phText, temperatureText } from './measure-text';

type Deviation = components['schemas']['Deviation'];

const points = (value: string) => formatFixedDecimal(value, 1);

type Measure = (value: string, limit: string) => string;

// La medición y el límite que cruzó, en las unidades de cada uno. En el estancamiento el valor es
// lo que bajó la humedad, en puntos; en el próximo a meta el límite es un rango «7.6-8.5».
const MEASURES: Partial<Record<PostharvestAlertKind, Measure>> = {
  drying_overdried: (value, limit) =>
    `${moistureText(value)} (por debajo de ${moistureText(limit)})`,
  drying_accelerated: (value, limit) =>
    `${moistureText(value)} (por debajo de ${moistureText(limit)})`,
  drying_slow_duration: (value, limit) =>
    `${moistureText(value)} (por encima de ${moistureText(limit)})`,
  drying_slow_stalled: (value, limit) =>
    `bajó ${points(value)} puntos (menos de ${points(limit)})`,
  drying_near_target: (value, limit) => {
    const [min, max] = limit.split('-');
    return `${moistureText(value)} (entre ${points(min)} y ${moistureText(max)})`;
  },
  fermentation_temperature_low: (value, limit) =>
    `${temperatureText(value)} (por debajo de ${temperatureText(limit)})`,
  fermentation_temperature_high: (value, limit) =>
    `${temperatureText(value)} (por encima de ${temperatureText(limit)})`,
  fermentation_ph_low: (value, limit) =>
    `pH ${phText(value)} (por debajo de ${phText(limit)})`,
  fermentation_ph_high: (value, limit) =>
    `pH ${phText(value)} (por encima de ${phText(limit)})`,
};

// Un desvío en una línea: «Sobresecado: 5,8 % (por debajo de 6,0 %)». Un tipo que esta versión no
// conoce sale con un texto genérico en vez de perderse.
export function deviationLine({ kind, value, limit }: Deviation) {
  const measure = isPostharvestAlertKind(kind) && MEASURES[kind];
  if (!measure) return `Valor fuera de los parámetros: ${points(value)}`;
  return `${POSTHARVEST_ALERT_TITLES[kind]}: ${measure(value, limit)}`;
}

// El aviso de quien acaba de guardar un registro con desvíos: el más importante en el título, junto
// a lo que se guardó, y el resto uno por línea. El crítico va primero aunque el servidor no lo
// ponga primero, y hace que el aviso no se cierre solo.
export function deviationNoticeText(
  alerts: readonly Deviation[],
  subject: string,
) {
  if (!alerts.length) return null;
  const ordered = [
    ...alerts.filter(({ severity }) => severity === 'critical'),
    ...alerts.filter(({ severity }) => severity !== 'critical'),
  ];
  const [first, ...rest] = ordered.map(deviationLine);
  return {
    title: `${subject} · ${first}`,
    description: rest.length ? rest.join('\n') : undefined,
    critical: ordered[0].severity === 'critical',
  };
}
