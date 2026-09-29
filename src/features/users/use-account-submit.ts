'use client';
import { useRef, useState } from 'react';
import type { FieldValues, UseFormSetError } from 'react-hook-form';
import { presentAccountError } from './account-errors';

// Envío de un formulario de cuentas: una sola petición a la vez (el doble clic no repite),
// el panel bloqueado mientras tanto y los errores en su campo o en el aviso general.
export function useAccountSubmit<T extends FieldValues>({
  setError,
  fields,
  messages,
  onBusy,
  keepLocked = false,
}: {
  setError: UseFormSetError<T>;
  fields: readonly string[];
  messages: { forbidden: string; fallback: string };
  onBusy: (value: boolean) => void;
  // Tras un alta el formulario se reemplaza por el detalle: no debe volver a enviarse.
  keepLocked?: boolean;
}) {
  const lock = useRef(false);
  const [failure, setFailure] = useState('');
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    onBusy(true);
    setFailure('');
    try {
      await action();
      lock.current = keepLocked;
    } catch (error) {
      lock.current = false;
      setFailure(presentAccountError(error, setError, fields, messages));
    } finally {
      onBusy(false);
    }
  }
  return { run, failure };
}
