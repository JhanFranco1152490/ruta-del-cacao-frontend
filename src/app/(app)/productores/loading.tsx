import { Skeleton } from '@/components/ui/skeleton';

export default function ProducersLoading() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-8">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-11 w-80" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
