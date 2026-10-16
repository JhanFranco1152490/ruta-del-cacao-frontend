'use client';

import { Check, Info, Pencil, Trash2 } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSession } from '@/hooks/use-session';

import { activityActions } from '../activity-actions';
import type { ActivityOfDay } from '../activity-days';
import { activityStateText, activityTitle } from '../activity-labels';
import { ActivityDetailFacts } from './activity-detail-facts';

// Lo que conviene hacer con una actividad atrasada, dicho donde se decide.
function lateNotice({ state, daysLate }: ActivityOfDay) {
  if (state === 'delayed') {
    return {
      className: 'border-warn/30 bg-warn-bg text-warn',
      text: `${activityStateText(state, daysLate)}. Si la labor no se hizo, reprográmala con Editar. Si ya se hizo, registra su realización.`,
    };
  }
  if (state === 'overdue') {
    return {
      className: 'border-err/30 bg-err-bg text-err',
      text: `${activityStateText(state, daysLate)}. Ya no se puede editar, reprogramar ni eliminar. Si la labor se hizo, registra su realización con la fecha real; si hay que hacerla, programa una nueva.`,
    };
  }
  return null;
}

// El detalle de una actividad y lo que se puede hacer con ella. Cada acción aparece si el estado
// y los permisos la permiten y quien abre el detalle sabe atenderla (`onEdit`, `completeHref`,
// `onDelete`).
export function ActivityDetailDialog({
  item,
  today,
  offline = false,
  onClose,
  onEdit,
  completeHref,
  monitoringHref,
  onDelete,
}: {
  item: ActivityOfDay;
  today: string;
  // Sin conexión se consulta y se registra la realización; editar y eliminar necesitan al servidor.
  offline?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  // La pantalla donde se registra la realización: es otra página, que abre también sin conexión.
  completeHref?: string;
  // La pantalla donde se registra el resultado de un monitoreo: la entrega quien une los dominios.
  monitoringHref?: string;
  onDelete?: () => void;
}) {
  const { data: user } = useSession();
  const { activity, state } = item;
  const { plot } = activity;
  const awaitingSync = item.completion === 'pending';
  const actions = activityActions(
    state,
    activity.activity_type,
    user,
    activity.assignee.id,
    awaitingSync,
  );
  // La labor ya se hizo: lo que convenía hacer con el atraso dejó de importar.
  const notice = awaitingSync ? null : lateNotice(item);
  const showEdit = actions.edit && !!onEdit;
  const showDelete = actions.remove && !!onDelete;
  const onlineOnly = offline && (showEdit || showDelete);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <p className="section-label">Actividad</p>
          <DialogTitle className="font-serif text-2xl leading-tight font-normal text-selva">
            {activityTitle(activity)}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 font-semibold">
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-extrabold whitespace-nowrap text-selva">
              {plot.code}
            </span>
            {plot.farm.name}
          </DialogDescription>
        </DialogHeader>
        {notice && (
          <p
            className={`rounded-md border px-4 py-3 text-sm leading-6 font-bold ${notice.className}`}
            role="status"
          >
            {notice.text}
          </p>
        )}
        {awaitingSync && (
          <p
            className="rounded-md border border-info/30 bg-info-bg px-4 py-3 text-sm leading-6 font-bold text-info"
            role="status"
          >
            Guardada en este teléfono. Se enviará sola cuando haya conexión;
            puedes seguirla en Registros del dispositivo.
          </p>
        )}
        {item.completion === 'error' && (
          <p
            className="rounded-md border border-err/30 bg-err-bg px-4 py-3 text-sm leading-6 font-bold text-err"
            role="alert"
          >
            El servidor no aceptó la realización guardada en este teléfono.
            Corrígela o descártala desde Registros del dispositivo.
          </p>
        )}
        <ActivityDetailFacts
          item={item}
          showProducer={user?.is_superuser === true}
          today={today}
          userId={user?.id}
        />
        {state === 'done' && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info aria-hidden="true" className="size-4 shrink-0" />
            Una actividad realizada no se modifica.
          </p>
        )}
        {onlineOnly && (
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            id="activity-needs-connection"
          >
            <Info aria-hidden="true" className="size-4 shrink-0" />
            Editar y eliminar una actividad necesitan conexión.
          </p>
        )}
        <DialogFooter>
          {showDelete && (
            <Button
              aria-describedby={
                offline ? 'activity-needs-connection' : undefined
              }
              className="sm:mr-auto"
              disabled={offline}
              onClick={onDelete}
              variant="destructive"
            >
              <Trash2 aria-hidden="true" /> Eliminar
            </Button>
          )}
          {showEdit && (
            <Button
              aria-describedby={
                offline ? 'activity-needs-connection' : undefined
              }
              disabled={offline}
              onClick={onEdit}
              variant="outline"
            >
              <Pencil aria-hidden="true" /> Editar
            </Button>
          )}
          {actions.complete && completeHref ? (
            <EditorLink className={buttonVariants()} href={completeHref}>
              <Check aria-hidden="true" /> Registrar realización
            </EditorLink>
          ) : actions.recordMonitoring && monitoringHref ? (
            <EditorLink className={buttonVariants()} href={monitoringHref}>
              <Check aria-hidden="true" /> Registrar monitoreo
            </EditorLink>
          ) : (
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
