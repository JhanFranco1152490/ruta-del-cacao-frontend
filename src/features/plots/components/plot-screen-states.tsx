import { pageContainerClass } from '@/components/page-container';
import { UnavailablePage } from '@/components/unavailable-page';
import { LoadingBlock } from '@/components/loading-block';

export function PlotEditorSkeleton() {
  return (
    <LoadingBlock
      className={pageContainerClass('wide', 'space-y-6')}
      label="Cargando parcela"
      shapes={['h-12 w-2/3', 'h-96']}
    />
  );
}

export function PlotUnavailable({
  message,
  backHref,
}: {
  message: string;
  backHref: string;
}) {
  return (
    <UnavailablePage
      backHref={backHref}
      backLabel="Volver a la finca"
      message={message}
      title="No fue posible abrir la parcela"
    />
  );
}
