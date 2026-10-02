import { EmptyState } from '@/components/empty-state';

// Aviso que ocupa el lugar de una pantalla completa, con el mismo margen que las pantallas.
export function PageNotice({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <EmptyState title={title} description={description} />
    </div>
  );
}
