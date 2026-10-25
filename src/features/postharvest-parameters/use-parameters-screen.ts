'use client';

import { parseAsString, useQueryState } from 'nuqs';

import { useHasConnection } from '@/hooks/use-has-connection';
import { useSession } from '@/hooks/use-session';
import { useProducerSummary } from '@/lib/api/producer-options';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import { useParameters } from './api';

export type ParametersScreenState = ReturnType<typeof useParametersScreen>;

// Todo lo que Parámetros lee y decide antes de dibujarse. La cuenta técnica elige el productor en la
// dirección (`?productor=`); las demás cuentas ven el suyo. Se cambia solo en línea y con lo que el
// servidor respondió: la copia del dispositivo es de solo consulta.
export function useParametersScreen() {
  const { data: user } = useSession();
  const hasConnection = useHasConnection();
  const [chosen, setProducer] = useQueryState(
    'productor',
    parseAsString.withOptions({ clearOnDefault: true }),
  );
  const superuser = user?.is_superuser === true;
  const producer = superuser ? chosen || null : null;
  const needsProducer = superuser && !producer;
  const read = useParameters(user?.id, producer, { enabled: !needsProducer });
  const selectedProducer = useProducerSummary(producer ?? undefined);
  const fromCopy = read.data?.savedAt !== undefined;
  const canChange =
    hasPermission(user, PERMISSIONS.PARAMETERS_CHANGE) &&
    hasConnection &&
    !fromCopy;

  return {
    superuser,
    producer,
    setProducer: (id: string | null) => void setProducer(id),
    selectedProducer,
    needsProducer,
    read,
    fromCopy,
    canChange,
    mayChange: hasPermission(user, PERMISSIONS.PARAMETERS_CHANGE),
  };
}
