export const ACTIVITY_VIEWS = [
  'mes',
  'semana',
  'lista',
  'parcela',
  'pendientes',
] as const;

export type ActivityView = (typeof ACTIVITY_VIEWS)[number];

export const ACTIVITY_VIEW_OPTIONS = [
  { value: 'mes', label: 'Mes' },
  { value: 'semana', label: 'Semana' },
  { value: 'lista', label: 'Lista' },
  { value: 'parcela', label: 'Por parcela' },
  { value: 'pendientes', label: 'Pendientes' },
] as const satisfies readonly { value: ActivityView; label: string }[];

// La vista con la que se abre el calendario si la dirección no trae otra: la cuadrícula del mes
// donde cabe y la lista donde no.
export const initialActivityView = (isDesktop: boolean): ActivityView =>
  isDesktop ? 'mes' : 'lista';

// Mes, Semana, Lista y Por parcela se mueven por periodo y llevan resumen; Pendientes no tiene
// periodo, lee su propia consulta.
export const isPeriodView = (view: ActivityView) => view !== 'pendientes';
