'use client';

import { Eye, FileX, RefreshCw, Upload } from 'lucide-react';
import { useState } from 'react';

import { InlineError } from '@/components/form-message';
import { SectionCard } from '@/components/page-blocks/section-card';
import { StatusChangeDialog } from '@/components/status-change-dialog';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import type { Sale } from '../api';
import { invoiceFileIssue } from '../invoice-file';
import { useAttachInvoice, useRemoveInvoice } from '../mutations';
import { openInvoice } from '../open-invoice';
import {
  type SaleOffer,
  saleOffers,
  type SalePermissions,
} from '../sale-actions';
import { saleFailureOf } from '../sale-errors';
import {
  INVOICE_ATTACHED,
  INVOICE_REMOVED,
  REMOVE_INVOICE_QUESTION,
} from '../sale-messages';
import { InvoiceFileButton } from './invoice-file-button';
import { InvoiceFileSummary } from './invoice-file-summary';

const REMOVE_INVOICE = {
  trigger: 'Quitar',
  title: REMOVE_INVOICE_QUESTION,
  description: 'El archivo se borra. Puedes adjuntar otro cuando quieras.',
  confirm: 'Quitar soporte',
  pending: 'Quitando…',
  Icon: FileX,
  variant: 'destructive' as const,
};

const OPEN_FAILED = 'No fue posible abrir el soporte. Inténtalo nuevamente.';

// El soporte de la factura de una venta: verlo y, mientras la venta esté registrada, adjuntarlo,
// reemplazarlo o quitarlo. Una venta anulada conserva el suyo, pero ya no cambia.
export function SaleInvoiceSection({
  sale,
  can,
  online,
}: {
  sale: Sale;
  can: SalePermissions;
  online: boolean;
}) {
  const attach = useAttachInvoice(sale.id);
  const remove = useRemoveInvoice(sale.id);
  const [error, setError] = useState<string>();
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string>();
  const offers = new Map(
    saleOffers(sale, can, online).map((offer) => [offer.action, offer]),
  );

  // Lo que rechaza el servidor va junto al soporte; si la venta ya estaba anulada, se avisa y la
  // ficha se vuelve a leer sola.
  const failed = (cause: unknown) => {
    const failure = saleFailureOf(cause);
    if (failure.kind === 'voided') notify.warning(failure.message);
    else setError(failure.message);
  };

  const upload = (file: File) => {
    const issue = invoiceFileIssue(file);
    setError(issue ?? undefined);
    if (issue) return;
    attach.mutate(file, {
      onSuccess: () => notify.success(INVOICE_ATTACHED),
      onError: failed,
    });
  };

  const view = () => {
    setError(undefined);
    if (!sale.invoice) return;
    openInvoice(sale.id, sale.invoice.file_name).catch(() =>
      setError(OPEN_FAILED),
    );
  };

  const busy = attach.isPending || remove.isPending;
  const fileButton = (offer: SaleOffer | undefined, label: string) =>
    offer && (
      <InvoiceFileButton
        disabled={busy || offer.disabledReason !== null}
        icon={sale.invoice ? RefreshCw : Upload}
        label={label}
        onFile={upload}
        title={offer.disabledReason ?? undefined}
      />
    );
  const viewOffer = offers.get('view-invoice');
  const removeOffer = offers.get('remove');

  return (
    <SectionCard accent="cobre" title="Soporte de la factura">
      <div className="space-y-3">
        {sale.invoice ? (
          <InvoiceFileSummary
            name={sale.invoice.file_name}
            size={sale.invoice.size}
          >
            {viewOffer && (
              <Button
                disabled={viewOffer.disabledReason !== null}
                onClick={view}
                size="office"
                title={viewOffer.disabledReason ?? undefined}
                type="button"
                variant="action"
              >
                <Eye aria-hidden="true" className="size-4" /> Ver
              </Button>
            )}
            {fileButton(offers.get('replace'), 'Reemplazar')}
            {removeOffer && (
              <Button
                disabled={busy || removeOffer.disabledReason !== null}
                onClick={() => setRemoving(true)}
                size="office"
                title={removeOffer.disabledReason ?? undefined}
                type="button"
                variant="outline"
              >
                <FileX aria-hidden="true" className="size-4" /> Quitar
              </Button>
            )}
          </InvoiceFileSummary>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground">Sin soporte</p>
            {fileButton(offers.get('attach'), 'Adjuntar soporte')}
          </div>
        )}
        {attach.isPending && (
          <p className="text-sm text-muted-foreground" role="status">
            Subiendo el soporte…
          </p>
        )}
        <InlineError>{error}</InlineError>
      </div>
      <StatusChangeDialog
        action={REMOVE_INVOICE}
        error={removeError}
        focusCancel
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              setRemoving(false);
              notify.success(INVOICE_REMOVED);
            },
            onError: (cause) => setRemoveError(saleFailureOf(cause).message),
          })
        }
        onOpenChange={(open) => {
          setRemoving(open);
          if (!open) setRemoveError(undefined);
        }}
        open={removing}
      />
    </SectionCard>
  );
}
