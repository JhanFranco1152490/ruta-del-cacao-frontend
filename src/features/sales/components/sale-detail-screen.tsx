'use client';

import { Layers, Package, Receipt } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

import { Breadcrumb } from '@/components/breadcrumb';
import { DetailFooter } from '@/components/detail-footer';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';
import { LoadingBlock } from '@/components/loading-block';
import { OfflineCopyNotice } from '@/components/offline-copy-notice';
import { pageContainerClass } from '@/components/page-container';
import { DetailHero } from '@/components/page-blocks/detail-hero';
import { SectionCard } from '@/components/page-blocks/section-card';
import { StatCell, StatStrip } from '@/components/page-blocks/stat-strip';
import { PageNotice } from '@/components/page-notice';
import { useHasConnection } from '@/hooks/use-has-connection';
import { usePrintDocument } from '@/hooks/use-print-document';
import { useSession } from '@/hooks/use-session';
import { isNotFound } from '@/lib/api/errors';
import { formatLongDate } from '@/lib/format/dates';
import { formatPesos } from '@/lib/format/pesos';
import { readOrigin } from '@/lib/navigation/origin';
import { buyerPath } from '@/lib/paths/buyers';
import { lotDetailPath } from '@/lib/paths/lots';
import { kilosText } from '@/lib/stock-quantity';

import { useSale } from '../queries';
import { saleOffers, salePermissionsOf } from '../sale-actions';
import { OFFLINE_SALES_REASON } from '../sale-messages';
import { SALES_PATH } from '../sale-paths';
import { SaleFacts } from './sale-facts';
import { SaleInvoiceSection } from './sale-invoice-section';
import { SaleLinesTable } from './sale-lines-table';
import { SalePrintAction } from './sale-print-action';
import { SaleReceiptDocument } from './sale-receipt-document';
import { SaleStatusBadge } from './sale-status-badge';
import { SaleVoidAction } from './sale-void-action';

const lineCountText = (count: number) =>
  count === 1 ? 'en 1 línea' : `en ${count} líneas`;

// La ficha de una venta: sus cifras, sus líneas y sus datos. Se consulta también sin conexión con la
// copia de la última vez que se abrió; cambiarla necesita conexión.
export function SaleDetailScreen() {
  const params = useSearchParams();
  const id = params?.get('id') ?? '';
  const { data: user } = useSession();
  const online = useHasConnection();
  const can = salePermissionsOf(user);
  const read = useSale(user?.id, id);
  const printer = usePrintDocument();
  // Volver lleva a la pantalla desde la que se abrió, con sus filtros, o a la lista.
  const backHref = readOrigin(params) ?? SALES_PATH;

  if (read.isError) {
    return isNotFound(read.error) ? (
      <PageNotice title="Esta venta no existe." />
    ) : (
      <PageNotice
        description="Ábrela una vez con conexión desde Ventas y quedará guardada en el dispositivo."
        illustration={OfflineCloud}
        title="Necesitas conexión para ver esta venta."
      />
    );
  }
  if (!read.data) {
    return (
      <LoadingBlock
        className={pageContainerClass('wide', 'space-y-4')}
        label="Cargando la venta"
        shapes={['h-32', 'h-24', 'h-64']}
      />
    );
  }

  const { data: sale, savedAt } = read.data;
  const fromCopy = !online || savedAt !== undefined;
  const voidOffer = saleOffers(sale, can, !fromCopy).find(
    ({ action }) => action === 'void',
  );

  return (
    <>
      {/* Al imprimir solo sale el comprobante: la ficha de pantalla se oculta. */}
      <div className={pageContainerClass('wide', 'space-y-4 print:hidden')}>
        <Breadcrumb
          items={[{ label: 'Ventas', href: backHref }, { label: sale.code }]}
        />
        <DetailHero
          accent="cobre"
          chips={<SaleStatusBadge status={sale.status} />}
          description={`${formatLongDate(sale.sale_date)} · ${sale.buyer.name}`}
          eyebrow="Venta"
          title={`Venta ${sale.code}`}
          tone="bosque"
        />
        {fromCopy && (
          <OfflineCopyNotice
            consequence={OFFLINE_SALES_REASON}
            savedAt={savedAt}
          />
        )}
        <StatStrip accent="cobre" label="Cifras de la venta">
          <StatCell
            icon={Receipt}
            label="Valor total"
            value={formatPesos(sale.total)}
          />
          <StatCell
            icon={Package}
            label="Kg de G1"
            value={kilosText(sale.g1_kg)}
          />
          <StatCell
            icon={Package}
            label="Kg de G2"
            value={kilosText(sale.g2_kg)}
          />
          <StatCell
            icon={Layers}
            label="Lotes"
            note={lineCountText(sale.lines.length)}
            value={String(new Set(sale.lines.map(({ lot }) => lot.id)).size)}
          />
        </StatStrip>
        <SectionCard accent="cobre" count={sale.lines.length} title="Líneas">
          <SaleLinesTable
            lines={sale.lines}
            lotHref={can.viewLot && !fromCopy ? lotDetailPath : null}
            total={sale.total}
          />
        </SectionCard>
        <SectionCard accent="cobre" title="Datos">
          <SaleFacts
            buyerHref={can.viewBuyer && !fromCopy ? buyerPath : null}
            sale={sale}
          />
        </SectionCard>
        <SaleInvoiceSection can={can} online={!fromCopy} sale={sale} />
        <DetailFooter backHref={backHref}>
          <SalePrintAction onPrint={printer.print} />
          {voidOffer && <SaleVoidAction offer={voidOffer} sale={sale} />}
        </DetailFooter>
      </div>
      {printer.printing && <SaleReceiptDocument sale={sale} />}
    </>
  );
}
