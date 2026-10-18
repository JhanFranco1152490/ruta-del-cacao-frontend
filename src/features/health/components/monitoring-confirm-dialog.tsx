'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
    <Dialog
      onOpenChange={(open) => {
        if (!open && !isSaving) onBack();
      }}
      open
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!isSaving}>
        <DialogHeader>
          <DialogTitle>¿Registrar este monitoreo?</DialogTitle>
          <DialogDescription className="text-base font-bold text-foreground">
            {summary.heading}
          </DialogDescription>
        </DialogHeader>
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
        {error && (
          <p className="text-sm font-bold text-err" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button disabled={isSaving} onClick={onBack} variant="outline">
            Volver
          </Button>
          <Button disabled={isSaving} onClick={onConfirm}>
            {isSaving ? 'Guardando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
