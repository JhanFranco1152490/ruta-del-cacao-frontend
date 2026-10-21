import { Skeleton } from '@/components/ui/skeleton';
import { pageContainerClass } from '@/components/page-container';

export default function ProducersLoading() {
  return (
    <div className={pageContainerClass('wide', 'space-y-6')}>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-11 w-80" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
