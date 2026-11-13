'use client';

import { Download, LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { getErrorMessage } from '@/lib/api/errors';
import type { ReportFilters } from '@/lib/api/query-keys';
import type { AudienceView } from '@/lib/audience-view';
import { notify } from '@/lib/notify';

import type { Report, ReportFileFormat } from '../api';
import { useExportReport } from '../queries';

const FORMATS: readonly { file: ReportFileFormat; label: string }[] = [
  { file: 'pdf', label: 'PDF' },
  { file: 'xlsx', label: 'Excel' },
  { file: 'csv', label: 'CSV' },
];

export const EXPORT_FAILED_MESSAGE = 'No fue posible descargar el reporte.';

// Descarga el reporte que se ve, con sus mismos filtros, en el formato elegido. Mientras descarga
// no se puede pedir otro; sin filas no hay nada que descargar. Si el servidor no lo entrega (el PDF
// admite menos filas que Excel y CSV), lo dice con su texto.
export function ReportExportMenu({
  view,
  filters,
  report,
}: {
  view: AudienceView;
  filters: ReportFilters;
  report: Report;
}) {
  const exporting = useExportReport();
  const busy = exporting.isPending;

  const download = (file: ReportFileFormat) =>
    exporting.mutate(
      { view, filters, file, report },
      {
        onError: (error) =>
          notify.error(getErrorMessage(error, EXPORT_FAILED_MESSAGE)),
      },
    );

  return (
    <Menu>
      <MenuTrigger
        disabled={busy || report.rows.length === 0}
        render={<Button className="h-10" size="office" variant="action" />}
      >
        {busy ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Download aria-hidden="true" className="size-4" />
        )}
        {busy ? 'Exportando…' : 'Exportar'}
      </MenuTrigger>
      <MenuContent>
        {FORMATS.map(({ file, label }) => (
          <MenuItem key={file} onClick={() => download(file)}>
            {label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
