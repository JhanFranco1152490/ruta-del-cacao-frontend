import { CacaoMark } from '@/components/brand/cacao-mark';
import { Button } from '@/components/ui/button';

// Lo que ve quien cerró sesión sin conexión: el inicio de sesión no abre sin red, así que se
// queda aquí hasta que vuelva. Con la conexión, `onRetry` envía el cierre pendiente al servidor y
// la guardia lleva al inicio de sesión sola.
export function SignedOutOffline({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <div className="max-w-md text-center text-selva">
        <CacaoMark className="mx-auto h-14 w-10 text-cobre" />
        <h1 className="mt-4 font-serif text-2xl">
          Cerraste sesión en este dispositivo
        </h1>
        <p role="status" className="mt-2 text-muted-foreground">
          Para volver a entrar necesitas conexión. Cuando regrese, la sesión se
          cerrará también en el servidor. Los registros que no alcanzaste a
          enviar se conservan en este dispositivo y se enviarán cuando vuelvas a
          entrar.
        </p>
        <Button size="office" className="mt-6" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </main>
  );
}
