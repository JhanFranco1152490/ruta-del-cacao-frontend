import { Button } from '@/components/ui/button';

// Un aviso que no impide iniciar el proceso de un lote, pero se confirma antes: el lote pesa más que
// el cajón elegido, o la humedad de entrada cae fuera del rango esperado.
export function StartWarning({
  message,
  disabled,
  onReview,
  onConfirm,
}: {
  message: string;
  disabled: boolean;
  onReview: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="space-y-3 rounded-(--radius) bg-warn-bg px-4 py-3"
      role="alert"
    >
      <p className="font-bold text-warn">{message}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onReview}
          size="office"
          type="button"
          variant="outline"
        >
          Revisar
        </Button>
        <Button
          disabled={disabled}
          onClick={onConfirm}
          size="office"
          type="button"
        >
          Iniciar de todos modos
        </Button>
      </div>
    </div>
  );
}
