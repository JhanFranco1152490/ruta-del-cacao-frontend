'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { getErrorMessage } from '@/lib/api/errors';
import { useResendActivation } from '../api';

export function ActivationDelivery({
  id,
  sent,
  canResend,
  onBusy,
}: {
  id: string;
  // Resultado del último envío conocido en esta visita; sin él solo se sabe que falta activar.
  sent?: boolean;
  canResend: boolean;
  onBusy: (value: boolean) => void;
}) {
  const mutation = useResendActivation();
  const lock = useRef(false);
  const [delivered, setDelivered] = useState(sent);
  const [failure, setFailure] = useState('');
  async function resend() {
    if (lock.current) return;
    lock.current = true;
    onBusy(true);
    setFailure('');
    try {
      const result = await mutation.mutateAsync(id);
      setDelivered(result.activation_email_sent);
      if (!result.activation_email_sent)
        setFailure(
          'No fue posible enviar el correo. Puedes intentarlo nuevamente.',
        );
    } catch (error) {
      setFailure(
        getErrorMessage(error, 'No fue posible reenviar la activación.'),
      );
    } finally {
      lock.current = false;
      onBusy(false);
    }
  }
  return (
    <section
      className="space-y-3 rounded-md border border-border p-4"
      aria-label="Envío de activación"
    >
      {delivered !== undefined && (
        <StatusBadge tone={delivered ? 'ok' : 'warn'}>
          {delivered ? 'Correo enviado' : 'Correo pendiente de envío'}
        </StatusBadge>
      )}
      <p role="status">
        {delivered === undefined
          ? 'La cuenta aún no se ha activado.'
          : delivered
            ? 'Se envió el correo de activación. La persona debe abrir el enlace y elegir su contraseña.'
            : 'La cuenta se creó, pero no se pudo enviar el correo de activación.'}
      </p>
      {!delivered && canResend && (
        <Button disabled={mutation.isPending} onClick={resend}>
          {mutation.isPending ? 'Reenviando…' : 'Reenviar activación'}
        </Button>
      )}
      {!delivered && !canResend && (
        <p>
          Solicita el reenvío a una persona con permiso para actualizar cuentas.
        </p>
      )}
      {failure && (
        <p role="alert" className="text-err">
          {failure}
        </p>
      )}
    </section>
  );
}
