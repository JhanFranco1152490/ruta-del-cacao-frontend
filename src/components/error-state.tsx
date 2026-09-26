import { Button } from '@/components/ui/button';

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-8 text-center" role="alert">
      <p className="font-bold text-err">{message}</p>
      {onRetry && (
        <Button className="mt-4 h-10" onClick={onRetry} variant="outline">
          Reintentar
        </Button>
      )}
    </div>
  );
}
