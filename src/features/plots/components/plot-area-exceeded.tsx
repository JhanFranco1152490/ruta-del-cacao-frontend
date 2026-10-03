import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import { formatHectares } from '@/lib/format/hectares';

// El área escrita no cabe en la finca. No basta con decirlo: cualquiera de las tres salidas
// arregla el problema, y quien registra no siempre sabe cuál le conviene.
export function PlotAreaExceeded({
  availableHectares,
  farmAreaHectares,
  farmDetailPath,
  farmEditPath,
  onUseAvailable,
}: {
  availableHectares: number;
  farmAreaHectares: string;
  farmDetailPath: string;
  // Sin él (quien registra no puede editar fincas) no se ofrece ampliarla.
  farmEditPath?: string;
  onUseAvailable: () => void;
}) {
  const available = formatHectares(availableHectares.toFixed(2));
  return (
    <div
      className="space-y-3 rounded-(--radius) bg-err-bg px-4 py-3"
      role="alert"
    >
      <p className="font-bold text-err">
        El área ingresada supera el área disponible de la finca
      </p>
      <p className="text-sm text-foreground">
        La finca mide {formatHectares(farmAreaHectares)} y le quedan {available}{' '}
        sin asignar. Puedes:
      </p>
      <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {availableHectares > 0 && (
          <li>
            <Button
              onClick={onUseAvailable}
              size="office"
              type="button"
              variant="outline"
            >
              Usar el área disponible ({available})
            </Button>
          </li>
        )}
        <li>
          {/* Se abre aparte: salir de esta pantalla perdería lo que ya se dibujó. */}
          <Link
            className={buttonVariants({ size: 'office', variant: 'outline' })}
            href={farmDetailPath}
            rel="noopener"
            target="_blank"
          >
            Revisar las otras parcelas
          </Link>
        </li>
        {farmEditPath && (
          <li>
            <Link
              className={buttonVariants({ size: 'office', variant: 'outline' })}
              href={farmEditPath}
              rel="noopener"
              target="_blank"
            >
              Ampliar el área de la finca
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}
