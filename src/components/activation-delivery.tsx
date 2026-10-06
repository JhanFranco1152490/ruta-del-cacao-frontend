'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { getErrorMessage } from '@/lib/api/errors';
import { ChangeActivationEmailDialog } from '@/components/change-activation-email-dialog';
import { useResendActivation } from '@/lib/api/accounts';

// Para la cuenta Productor: su correo es el del expediente y se cambia allí; después se reenvía la
// activación desde aquí.
export const CHANGE_RECORD_EMAIL_HINT =
  'Para cambiar el correo, edita el expediente del productor y luego reenvía la activación.';

export function ActivationDelivery({
  id,
  email,
  sent,
  canResend,
  canChangeEmail = false,
  changeEmailHint,
  onBusy,
}: {
  id: string;
  // El correo al que sale la activación.
  email: string;
  // Resultado del último envío conocido en esta visita; sin él solo se sabe que falta activar.
  sent?: boolean;
  canResend: boolean;
  // Corregir el correo desde aquí (cuentas cuyo correo es de la cuenta misma).
  canChangeEmail?: boolean;
  // Qué decir cuando el correo no se cambia desde aquí (p. ej. se cambia en el expediente).
  changeEmailHint?: string;
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
            ? 'Se envió el correo de activación. La persona debe abrir el enlace y elegir su contraseña; si no lo ve, que revise la carpeta de spam.'
            : 'La cuenta se creó, pero no se pudo enviar el correo de activación.'}
      </p>
      {canResend && (
        <div className="flex flex-wrap gap-3">
          {/* También después de enviado: el correo pudo perderse o el enlace vencer (72 horas). */}
          <Button
            className="h-11"
            disabled={mutation.isPending}
            onClick={resend}
            variant={delivered ? 'outline' : 'default'}
          >
            {mutation.isPending ? 'Reenviando…' : 'Reenviar activación'}
          </Button>
          {canChangeEmail && (
            <ChangeActivationEmailDialog
              email={email}
              id={id}
              onBusy={onBusy}
              onSent={(wasSent) => {
                setDelivered(wasSent);
                setFailure(
                  wasSent
                    ? ''
                    : 'El correo se cambió, pero no se pudo enviar la activación. Puedes reenviarla.',
                );
              }}
            />
          )}
        </div>
      )}
      {canResend && !canChangeEmail && changeEmailHint && (
        <p className="text-sm text-muted-foreground">{changeEmailHint}</p>
      )}
      {!canResend && (
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
