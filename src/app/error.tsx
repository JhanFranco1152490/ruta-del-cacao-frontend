'use client';

import Link from 'next/link';

import { StatusPage } from '@/components/status-page';
import { Button, buttonVariants } from '@/components/ui/button';

// El error no se escribe en la consola: puede traer datos personales de la pantalla que falló.
export default function AppError({ retry }: { retry: () => void }) {
  return (
    <StatusPage
      eyebrow="Algo salió mal"
      title="No pudimos mostrar esta pantalla"
      description="Lo que guardaste en el dispositivo sigue ahí. Inténtalo de nuevo o vuelve al inicio."
      actions={
        <>
          <Button size="office" onClick={retry}>
            Intentar de nuevo
          </Button>
          <Link
            className={buttonVariants({ size: 'office', variant: 'outline' })}
            href="/"
          >
            Ir al inicio
          </Link>
        </>
      }
    />
  );
}
