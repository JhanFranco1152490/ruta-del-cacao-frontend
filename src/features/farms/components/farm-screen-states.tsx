import { pageContainerClass } from '@/components/page-container';
import { UnavailablePage } from '@/components/unavailable-page';
import { LoadingBlock } from '@/components/loading-block';

export function FarmScreenSkeleton() {
  return (
    <LoadingBlock
      className={pageContainerClass('wide', 'space-y-6')}
      label="Cargando finca"
      shapes={['h-12 w-2/3', 'h-28', 'h-72']}
    />
  );
}

export function FarmUnavailable({ message }: { message: string }) {
  return (
    <UnavailablePage
      backHref="/fincas"
      backLabel="Volver a mis fincas"
      message={message}
      title="No fue posible abrir la finca"
    />
  );
}
