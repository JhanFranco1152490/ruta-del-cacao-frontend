'use client';

import { useRouter } from 'next/navigation';

import { useIsOnline } from '@/hooks/use-is-online';
import { useReturnPath } from '@/hooks/use-return-path';
import { notify } from '@/lib/notify';

// Lo que hace un editor al guardar bien: vuelve a la pantalla desde la que se abrió (con sus
// filtros y su página) o a `fallback`, y avisa. Si no hay conexión, el cambio quedó en el
// dispositivo y el aviso lo dice, porque no llega al servidor hasta que vuelva la red.
export function useFinishEdit(fallback: string) {
  const router = useRouter();
  const returnPath = useReturnPath(fallback);
  const isOnline = useIsOnline();

  const finish = (title: string) => {
    router.replace(returnPath);
    notify.success(
      title,
      isOnline
        ? undefined
        : { description: 'Se enviará cuando haya conexión.' },
    );
  };

  return { returnPath, finish };
}
