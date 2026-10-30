import type { ParameterKey } from './parameter-fields';

export type ParameterRowField = { key: ParameterKey; label: string };

// Un parámetro (o un par) tal como se muestra: su nombre, lo que hace y los campos que lo fijan.
export type ParameterRowConfig = {
  id: string;
  title: string;
  description: string;
  fields: readonly ParameterRowField[];
};

export type SectionId = 'secado' | 'alertas' | 'fermentacion';

export type ParameterSectionConfig = {
  id: SectionId;
  title: string;
  // El nombre corto de su pestaña.
  tab: string;
  rows: readonly ParameterRowConfig[];
};

const MIN_MAX = (min: ParameterKey, max: ParameterKey) =>
  [
    { key: min, label: 'Mínimo' },
    { key: max, label: 'Máximo' },
  ] as const;

// Los 21 valores, en dos tarjetas y en el orden en que se explican.
export const PARAMETER_SECTIONS: readonly ParameterSectionConfig[] = [
  {
    id: 'fermentacion',
    title: 'Fermentación',
    tab: 'Fermentación',
    rows: [
      {
        id: 'first-turn',
        title: 'Primer volteo',
        description:
          'Horas desde el inicio de la fermentación hasta que toca el primer volteo.',
        fields: [{ key: 'first_turn_hours', label: 'A las' }],
      },
      {
        id: 'next-turns',
        title: 'Volteos siguientes',
        description: 'Horas entre un volteo y el siguiente.',
        fields: [{ key: 'next_turn_hours', label: 'Cada' }],
      },
      {
        id: 'temperature',
        title: 'Temperatura de referencia',
        description:
          'Rango esperado en el centro de la masa. Se muestra al registrar un volteo. Fuera de él, se avisa sin bloquear el registro.',
        fields: MIN_MAX('temperature_min_c', 'temperature_max_c'),
      },
      {
        id: 'ph',
        title: 'pH de referencia',
        description:
          'Rango esperado del pH del grano (no de la pulpa). Se muestra al registrar un volteo. Fuera de él, se avisa sin bloquear el registro.',
        fields: MIN_MAX('ph_min', 'ph_max'),
      },
    ],
  },
  {
    id: 'secado',
    title: 'Secado',
    tab: 'Secado',
    rows: [
      {
        id: 'entry-moisture',
        title: 'Humedad de entrada',
        description:
          'Rango esperado al iniciar el secado. Fuera de él, se pide confirmar.',
        fields: MIN_MAX('entry_moisture_min_pct', 'entry_moisture_max_pct'),
      },
      {
        id: 'target-moisture',
        title: 'Humedad meta',
        description: 'Rango en el que el grano está listo para ensacar.',
        fields: MIN_MAX('target_moisture_min_pct', 'target_moisture_max_pct'),
      },
      {
        id: 'estimated-days',
        title: 'Días estimados',
        description: 'Duración normal del secado.',
        fields: MIN_MAX('estimated_days_min', 'estimated_days_max'),
      },
    ],
  },
  {
    id: 'alertas',
    title: 'Alertas del secado',
    tab: 'Alertas',
    rows: [
      {
        id: 'slow-stall',
        title: 'Secado lento · por estancamiento',
        description:
          'Riesgo de hongo. Avisa si en esa ventana la humedad baja menos que lo indicado. Puntos de humedad: de 30 % a 26 % son 4 puntos.',
        fields: [
          { key: 'slow_stall_min_drop_pct', label: 'Baja menos de' },
          { key: 'slow_stall_window_hours', label: 'En' },
        ],
      },
      {
        id: 'slow-duration',
        title: 'Secado lento · por duración',
        description:
          'Riesgo de hongo. Avisa si desde ese día la humedad sigue por encima del umbral.',
        fields: [
          { key: 'slow_duration_day', label: 'Desde el día' },
          { key: 'slow_duration_moisture_pct', label: 'Con más de' },
        ],
      },
      {
        id: 'accelerated',
        title: 'Secado acelerado',
        description: 'Riesgo de daño físico: el grano secó demasiado rápido.',
        fields: [
          { key: 'accelerated_day', label: 'Hasta el día' },
          { key: 'accelerated_moisture_pct', label: 'Con menos de' },
        ],
      },
      {
        id: 'near-target',
        title: 'Próximo a meta',
        description: 'Aviso para preparar el ensacado.',
        fields: MIN_MAX('near_target_min_pct', 'near_target_max_pct'),
      },
      {
        id: 'overdried',
        title: 'Sobresecado',
        description:
          'La alerta crítica: se muestra destacada sobre las demás notificaciones.',
        fields: [{ key: 'overdried_moisture_pct', label: 'Por debajo de' }],
      },
    ],
  },
];

// En qué tarjeta se edita un parámetro: con los campos repartidos en pestañas, un error en la que no
// se ve se señala en su pestaña.
export const sectionOfKey = (key: ParameterKey): SectionId =>
  PARAMETER_SECTIONS.find(({ rows }) =>
    rows.some(({ fields }) => fields.some((field) => field.key === key)),
  )!.id;
