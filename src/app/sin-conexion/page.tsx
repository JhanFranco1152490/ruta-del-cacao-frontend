import { cn } from 'cn';
import Link from 'next/link';

import { CacaoMark } from '@/components/brand/cacao-mark';
import { buttonVariants } from '@/components/ui/button';

// Lo que ve quien abre sin conexión una página que no quedó guardada en el dispositivo. Fuera del
// grupo con sesión: no exige validar la sesión para mostrarse.
export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <div className="max-w-md text-center text-selva">
        <CacaoMark className="mx-auto h-14 w-10 text-cobre" />
        <h1 className="mt-4 font-serif text-2xl">
          Esta pantalla necesita conexión
        </h1>
        <p className="mt-2 text-muted-foreground">
          Las fincas y sus capturas sí funcionan sin conexión.
        </p>
        <Link
          className={cn(buttonVariants({ size: 'office' }), 'mt-6')}
          href="/fincas"
        >
          Ir a mis fincas
        </Link>
      </div>
    </main>
  );
}
