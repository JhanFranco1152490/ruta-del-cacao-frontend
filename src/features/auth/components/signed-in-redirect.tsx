'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { HOME_PATH } from '@/config/routes';

import { useSession } from '../api';

// Para las pantallas que solo sirven sin sesión: si ya hay una, lleva a la entrada. No tapa el
// formulario mientras se comprueba (quien no tiene sesión no debe esperar al servidor para
// escribir). Solo cuenta una consulta exitosa: tras un 401 la caché conserva el usuario anterior
// con la consulta en error, y redirigir entonces chocaría con la guardia que acaba de mandar aquí.
export function SignedInRedirect() {
  const router = useRouter();
  const { isSuccess } = useSession();

  useEffect(() => {
    if (isSuccess) router.replace(HOME_PATH);
  }, [isSuccess, router]);

  return null;
}
