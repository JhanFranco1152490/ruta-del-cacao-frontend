import { Skeleton } from '@/components/ui/skeleton';

export function ProducerTableSkeleton() {
  return (
    <div className="space-y-px bg-divider p-px">
      {[0, 1, 2, 3].map((index) => (
        <div className="grid grid-cols-4 gap-5 bg-card p-4" key={index}>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ProducerDetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-8 sm:px-8">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-11 w-80" />
      <Skeleton className="h-72 w-full" />
    </main>
  );
}
