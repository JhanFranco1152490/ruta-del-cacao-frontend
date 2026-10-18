import { scheduledDateIssue } from '@/lib/activity-dates';
import { type UsedInputRow, usedInputIssues } from '@/lib/input-usage';

import type { ControlMethod } from './monitoring-rules';

export const METHOD_DESCRIPTION_MAX_LENGTH = 80;

export type ControlIssue = { path: (string | number)[]; message: string };

// Lo que el servidor rechazaría de lo que se hace contra una detección, en un control programado o
// realizado: qué se hizo es obligatorio en uno realizado; "Otro" pide escribir qué; y una aplicación
// de producto hecha pide el producto, con las filas de insumo bien escritas. Las rutas son relativas
// al control; quien valida les pone delante dónde está el control en su formulario.
export function controlWorkIssues(control: {
  mode: 'done' | 'scheduled';
  method: '' | ControlMethod;
  method_description: string;
  inputs: readonly UsedInputRow[];
}): ControlIssue[] {
  const issues: ControlIssue[] = [];
  const { mode, method } = control;
  if (mode === 'done' && !method) {
    issues.push({ path: ['method'], message: 'Indica qué hiciste' });
  }
  if (method === 'other') {
    if (!control.method_description) {
      issues.push({
        path: ['method_description'],
        message:
          mode === 'done' ? 'Escribe qué hiciste' : 'Escribe qué se va a hacer',
      });
    } else if (
      control.method_description.length > METHOD_DESCRIPTION_MAX_LENGTH
    ) {
      issues.push({
        path: ['method_description'],
        message: `Usa máximo ${METHOD_DESCRIPTION_MAX_LENGTH} caracteres.`,
      });
    }
  }
  if (mode !== 'done') return issues;
  if (method === 'product_application' && control.inputs.length === 0) {
    issues.push({
      path: ['inputs'],
      message: 'Agrega el producto que aplicaste',
    });
  }
  for (const { index, field, message } of usedInputIssues(control.inputs)) {
    issues.push({ path: ['inputs', index, field], message });
  }
  return issues;
}

// Un control programado necesita su fecha, desde hoy, y quién lo hará.
export function scheduleIssues(
  control: { scheduled_date: string; assignee_id: string },
  today: string,
): ControlIssue[] {
  const issues: ControlIssue[] = [];
  if (!control.scheduled_date) {
    issues.push({ path: ['scheduled_date'], message: 'Indica la fecha' });
  } else {
    const error = scheduledDateIssue(control.scheduled_date, today);
    if (error) issues.push({ path: ['scheduled_date'], message: error });
  }
  if (!control.assignee_id) {
    issues.push({ path: ['assignee_id'], message: 'Elige el responsable' });
  }
  return issues;
}
