import Link from 'next/link';

import { StatusPage } from '@/components/status-page';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="Página no encontrada"
      title="Esta dirección no existe"
      description="Puede que el enlace esté mal escrito o que la página se haya movido."
      actions={
        <Link className={buttonVariants({ size: 'office' })} href="/">
          Ir al inicio
        </Link>
      }
    />
  );
}
