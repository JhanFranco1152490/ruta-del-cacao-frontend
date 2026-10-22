'use client';

import { ChevronDown, Images } from 'lucide-react';
import { Fragment, useState } from 'react';

import { COMPACT_TABLE_CLASS } from '@/components/compact-table-class';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { useSession } from '@/hooks/use-session';
import type { components } from '@/lib/api/schema';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { formatShortWeekdayDate } from '@/lib/format/dates';
import { formatDecimal } from '@/lib/format/decimal';

import {
  controlRowText,
  type Detection,
  detectionName,
  detectionStatus,
} from '../detection-status';
import type { HistoryRow } from '../history-rows';
import { SAMPLING_METHOD_OPTIONS, unitName } from '../monitoring-rules';
import { DetectionActions } from './detection-actions';
import { EvidenceSection } from './evidence-section';

type AgriculturalActivity = components['schemas']['AgriculturalActivity'];

const STATUS_CLASS = {
  none: 'text-warn',
  requested: 'text-warn',
  dismissed: 'text-muted-foreground',
} as const;

// La incidencia con una barra que se llena según el porcentaje: de un vistazo se ve qué pesa más.
function IncidenceCell({
  detection,
  activity,
}: {
  detection: Detection;
  activity: AgriculturalActivity;
}) {
  const percent = Math.min(100, Number(detection.incidence));
  const unit = activity.monitoring
    ? unitName(activity.monitoring.sampling_unit, detection.affected_units)
    : '';
  return (
    <>
      <span className="font-bold tabular-nums">
        {formatDecimal(detection.incidence, 2)} %
      </span>
      <span className="text-muted-foreground max-md:hidden">
        {' '}
        · {detection.affected_units} {unit}
      </span>
      <span
        aria-hidden="true"
        className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-alt max-md:hidden"
      >
        <span
          className="block h-full rounded-full bg-cobre"
          style={{ width: `${percent}%` }}
        />
      </span>
    </>
  );
}

function ControlCell({ detection }: { detection: Detection }) {
  const status = detectionStatus(detection);
  if (!status) {
    return (
      <ul aria-label="Controles" className="space-y-0.5">
        {detection.controls.map((control) => (
          <li key={control.id}>{controlRowText(control)}</li>
        ))}
      </ul>
    );
  }
  return (
    <span className={`font-bold ${STATUS_CLASS[status.kind]}`}>
      {status.text}
    </span>
  );
}

const methodLabel = (method: string | null | undefined) =>
  SAMPLING_METHOD_OPTIONS.find((option) => option.value === method)?.label;

// Lo que no cabe en la fila: qué se evaluó, quién lo registró, las observaciones y las fotos.
function MonitoringDetail({ activity }: { activity: AgriculturalActivity }) {
  const { monitoring } = activity;
  if (!monitoring) return null;
  const method = methodLabel(monitoring.sampling_method);
  return (
    <div className="space-y-2 py-1 text-sm">
      <p>
        <span className="font-bold">Evaluado: </span>
        {monitoring.evaluated_units}{' '}
        {unitName(monitoring.sampling_unit, monitoring.evaluated_units)}
        {method ? ` · ${method.toLowerCase()}` : ''}
        {activity.completed_by &&
          ` · Registró ${activity.completed_by.full_name}`}
      </p>
      {monitoring.notes && (
        <p>
          <span className="font-bold">Observaciones: </span>
          {monitoring.notes}
        </p>
      )}
      <EvidenceSection activity={activity} />
    </div>
  );
}

// Las filas de un monitoreo con su detalle desplegable: el estado de abierto vive aquí para que
// todas las filas del mismo monitoreo compartan un solo detalle.
function MonitoringRows({ rows }: { rows: readonly HistoryRow[] }) {
  const [open, setOpen] = useState(false);
  const { activity } = rows[0];
  const photos = activity.monitoring?.evidence_count ?? 0;
  const { data: user } = useSession();
  const isDesktop = useIsDesktop();
  const canAct = hasPermission(user, PERMISSIONS.ACTIVITIES_ADD);
  const detailButton = (
    <Button
      aria-expanded={open}
      className="h-9 text-sm"
      onClick={() => setOpen((value) => !value)}
      type="button"
      variant="outline"
    >
      <ChevronDown
        aria-hidden="true"
        className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
      />
      Detalle
      {photos > 0 && (
        <span className="inline-flex items-center gap-1 font-normal">
          <Images aria-hidden="true" className="size-4" />
          {photos}
          <span className="sr-only"> fotos</span>
        </span>
      )}
    </Button>
  );
  return (
    <Fragment>
      {rows.map(({ key, date, detection, first }) => (
        <TableRow key={key}>
          <TableCell className="first-letter:uppercase max-md:order-4 max-md:col-span-1! max-md:text-muted-foreground">
            {formatShortWeekdayDate(date)}
          </TableCell>
          <TableCell className="max-w-56 break-words whitespace-normal max-md:order-3 max-md:text-muted-foreground">
            <span className="font-bold max-md:font-normal">
              {activity.plot.code}
            </span>
            <span className="block text-sm text-muted-foreground max-md:inline">
              <span className="md:hidden"> · </span>
              {activity.plot.farm.name}
            </span>
          </TableCell>
          <TableCell className="font-bold max-md:order-1 max-md:col-span-1! max-md:text-base!">
            {detection ? (
              detectionName(detection)
            ) : (
              <StatusBadge tone="ok">Sin presencia</StatusBadge>
            )}
          </TableCell>
          <TableCell className="min-w-36 max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
            {detection ? (
              <IncidenceCell activity={activity} detection={detection} />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </TableCell>
          <TableCell className="max-md:order-5">
            {detection ? (
              <ControlCell detection={detection} />
            ) : (
              <span className="text-muted-foreground max-md:hidden">—</span>
            )}
          </TableCell>
          <TableCell className="max-md:order-6">
            {detection && canAct && detection.controls.length === 0 ? (
              <DetectionActions
                compact
                detection={detection}
                menu={!isDesktop}
                monitoring={activity}
              >
                {first && detailButton}
              </DetectionActions>
            ) : (
              <div className="flex md:justify-end">{first && detailButton}</div>
            )}
          </TableCell>
          {/* En celular cada fila es una tarjeta: el detalle se abre dentro de la primera, no en otra. */}
          {first && open && !isDesktop && (
            <TableCell className="max-md:order-7">
              <div className="mt-2 border-t border-border pt-2">
                <MonitoringDetail activity={activity} />
              </div>
            </TableCell>
          )}
        </TableRow>
      ))}
      {open && isDesktop && (
        <TableRow>
          <TableCell className="md:col-span-6" colSpan={6}>
            <MonitoringDetail activity={activity} />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

// El historial de monitoreos como tabla: una fila por plaga o enfermedad encontrada (o una «sin
// presencia»), en tarjetas compactas en celular.
export function HistoryTable({ rows }: { rows: readonly HistoryRow[] }) {
  const groups: HistoryRow[][] = [];
  for (const row of rows) {
    const last = groups.at(-1);
    if (last && last[0].activity.id === row.activity.id) last.push(row);
    else groups.push([row]);
  }
  return (
    // Sin la flecha de las tarjetas que se abren (`pr-10`): aquí ninguna fila es un enlace.
    <Table
      aria-label="Monitoreos"
      className={`${COMPACT_TABLE_CLASS} max-md:[&_tr]:pr-3!`}
    >
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Parcela</TableHead>
          <TableHead>Plaga o enfermedad</TableHead>
          <TableHead>Incidencia</TableHead>
          <TableHead>Control</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <MonitoringRows key={group[0].activity.id} rows={group} />
        ))}
      </TableBody>
    </Table>
  );
}
