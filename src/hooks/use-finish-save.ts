'use client';

import { useRouter } from 'next/navigation';

import { useIsOnline } from '@/hooks/use-is-online';
import { useReturnPath } from '@/hooks/use-return-path';
import { notify, type NoticeOptions } from '@/lib/notify';

// Lo que hace un editor o un formulario de alta al guardar bien: vuelve a la pantalla desde la que se abrió (con sus
// filtros y su página) o a `fallback`, y avisa. Si no hay conexión, el cambio quedó en el
// dispositivo y el aviso lo dice, porque no llega al servidor hasta que vuelva la red.
export function useFinishSave(fallback: string) {
  const router = useRouter();
  const returnPath = useReturnPath(fallback);
  const isOnline = useIsOnline();

  // `action` es el siguiente paso probable («Registrar otra parcela»): el aviso lo ofrece unos
  // segundos, así que quien captura varios seguidos no tiene que volver a abrir el formulario.
  const finish = (title: string, options?: Pick<NoticeOptions, 'action'>) => {
    router.replace(returnPath);
    notify.success(title, {
      ...options,
      ...(!isOnline && { description: 'Se enviará cuando haya conexión.' }),
    });
  };

  return { returnPath, finish };
}
