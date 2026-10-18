import { z } from 'zod';

import { doneDateIssue } from '@/lib/activity-dates';
import { dateInBogota } from '@/lib/format/dates';
import { normalizeQuantity } from '@/lib/input-usage';

import { controlWorkIssues, scheduleIssues } from './control-rules';
import {
  CONTROL_METHOD_OPTIONS,
  type ControlMethod,
  detectionKey,
  OTHER_PEST_DISEASE,
  parseUnits,
  SAMPLING_METHOD_OPTIONS,
  type SamplingMethod,
} from './monitoring-rules';

export const OTHER_DESCRIPTION_MAX_LENGTH = 100;
export { METHOD_DESCRIPTION_MAX_LENGTH } from './control-rules';
export const NOTES_MAX_LENGTH = 500;
export const treesExceededMessage = (plotTrees: number) =>
  `No puedes evaluar más árboles de los que tiene la parcela (${plotTrees})`;
export const REPEATED_DETECTION_MESSAGE =
  'Esta plaga o enfermedad ya está en la lista. Modifica la detección existente';

const methodValues = CONTROL_METHOD_OPTIONS.map(({ value }) => value);
const samplingMethodValues = SAMPLING_METHOD_OPTIONS.map(({ value }) => value);
const maxLength = (length: number) => `Usa máximo ${length} caracteres.`;

const controlShape = z.object({
  id: z.string(),
  mode: z.enum(['none', 'done', 'scheduled', 'requested']),
  method: z.enum(['', ...methodValues] as ['', ...ControlMethod[]]),
  method_description: z.string().trim(),
  inputs: z.array(
    z.object({
      input_id: z.string(),
      quantity: z.string().transform(normalizeQuantity),
    }),
  ),
  scheduled_date: z.string().trim(),
  assignee_id: z.string(),
  planned_input_id: z.string(),
});

export type ControlValues = z.output<typeof controlShape>;
type Issue = (path: (string | number)[], message: string) => void;

// Lo que el servidor rechazaría del control de una detección, dicho antes de guardar. `at` es la
// ruta del control en el formulario. Uno hecho en el momento toma la fecha del monitoreo y queda a
// nombre de quien registra, así que no pide ni fecha ni responsable.
function checkControl(
  control: ControlValues,
  today: string,
  at: (string | number)[],
  issue: Issue,
) {
  const { mode } = control;
  if (mode === 'none' || mode === 'requested') return;
  const issues = [
    ...controlWorkIssues({ ...control, mode }),
    ...(mode === 'scheduled' ? scheduleIssues(control, today) : []),
  ];
  for (const { path, message } of issues) issue([...at, ...path], message);
}

// Un monitoreo registrado no se corrige, así que se valida antes de guardar todo lo que el
// servidor va a comprobar. `today` es la fecha de Bogotá y `scheduledAt` el momento en que se
// programó: la fecha de realización no puede ser anterior a ese día.
export const createMonitoringSchema = ({
  today,
  scheduledAt,
  plotTrees = null,
}: {
  today: string;
  scheduledAt: string;
  // Los árboles que suma la ficha de la parcela, o `null` si no se saben: entonces no se limita.
  plotTrees?: number | null;
}) =>
  z
    .object({
      done_date: z.string().trim(),
      sampling_unit: z.enum(['trees', 'pods']),
      evaluated_units: z.string().trim(),
      sampling_method: z.enum(['', ...samplingMethodValues] as [
        '',
        ...SamplingMethod[],
      ]),
      no_presence: z.boolean(),
      notes: z.string().trim(),
      detections: z.array(
        z.object({
          id: z.string(),
          pest_disease_id: z.string(),
          other_description: z.string().trim(),
          affected_units: z.string().trim(),
          control: controlShape,
        }),
      ),
    })
    .superRefine((values, context) => {
      const issue: Issue = (path, message) =>
        context.addIssue({ code: 'custom', path, message });

      const dateError = doneDateIssue(values.done_date, today, {
        date: dateInBogota(scheduledAt),
        reason: 'la programación de la actividad',
      });
      if (dateError) issue(['done_date'], dateError);
      const evaluated = parseUnits(values.evaluated_units);
      if (evaluated === null) {
        issue(['evaluated_units'], 'Indica cuántas unidades evaluaste');
      } else if (
        values.sampling_unit === 'trees' &&
        plotTrees !== null &&
        evaluated > plotTrees
      ) {
        issue(['evaluated_units'], treesExceededMessage(plotTrees));
      }
      if (values.notes.length > NOTES_MAX_LENGTH) {
        issue(['notes'], maxLength(NOTES_MAX_LENGTH));
      }
      // Sin presencia, las detecciones que quedaron en pantalla no se envían.
      if (values.no_presence) return;
      if (values.detections.length === 0) {
        issue(
          ['detections'],
          'Agrega al menos una detección o marca Sin presencia',
        );
        return;
      }

      const seen = new Set<string>();
      values.detections.forEach((row, index) => {
        const at = ['detections', index];
        const isOther = row.pest_disease_id === OTHER_PEST_DISEASE;
        if (!row.pest_disease_id) {
          issue([...at, 'pest_disease_id'], 'Elige la plaga o enfermedad');
        } else if (isOther && !row.other_description) {
          issue([...at, 'other_description'], 'Escribe qué encontraste');
        } else if (
          isOther &&
          row.other_description.length > OTHER_DESCRIPTION_MAX_LENGTH
        ) {
          issue(
            [...at, 'other_description'],
            maxLength(OTHER_DESCRIPTION_MAX_LENGTH),
          );
        }
        const key = detectionKey(row);
        if (key && seen.has(key)) {
          issue(
            [...at, isOther ? 'other_description' : 'pest_disease_id'],
            REPEATED_DETECTION_MESSAGE,
          );
        }
        if (key) seen.add(key);

        const affected = parseUnits(row.affected_units);
        if (affected === null) {
          issue([...at, 'affected_units'], 'Indica las unidades afectadas');
        } else if (evaluated !== null && affected > evaluated) {
          issue(
            [...at, 'affected_units'],
            `Las unidades afectadas no pueden superar las evaluadas (${evaluated})`,
          );
        }
        checkControl(row.control, today, [...at, 'control'], issue);
      });
    });

export type MonitoringFormValues = z.output<
  ReturnType<typeof createMonitoringSchema>
>;
export type DetectionValues = MonitoringFormValues['detections'][number];
