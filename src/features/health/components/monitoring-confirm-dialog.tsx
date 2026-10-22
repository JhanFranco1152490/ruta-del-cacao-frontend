'use client';

import { SaveConfirmDialog } from '@/components/save-confirm-dialog';

import type { monitoringSummary } from '../monitoring-summary';

// Un monitoreo registrado no se corrige: antes de guardarlo se dice, detección por detección, qué
// se va a registrar y qué control lleva cada una.
export function MonitoringConfirmDialog({
  summary,
  confirmLabel,
  isSaving,
  error,
  onConfirm,
  onBack,
}: {
  summary: ReturnType<typeof monitoringSummary>;
  // Lo que va a pasar al confirmar: "Guardar monitoreo" o "Guardar en el teléfono".
  confirmLabel: string;
  isSaving: boolean;
  error?: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <SaveConfirmDialog
      confirmLabel={confirmLabel}
      error={error}
      isSaving={isSaving}
      onBack={onBack}
      onConfirm={onConfirm}
      summary={summary.heading}
      summaryClassName="text-base font-bold text-foreground"
      title="¿Registrar este monitoreo?"
    >
      {summary.detections.length > 0 && (
        <ul className="space-y-3" aria-label="Detecciones">
          {summary.detections.map(({ title, control }) => (
            <li className="border-l-4 border-selva pl-3" key={title}>
              <p className="font-bold">{title}</p>
              <p className="text-sm text-muted-foreground">{control}</p>
            </li>
          ))}
        </ul>
      )}
      {summary.photos && <p className="text-sm">{summary.photos}</p>}
      <p className="text-sm font-bold text-warn">
        Después no se podrá modificar.
      </p>
    </SaveConfirmDialog>
  );
}
