'use client';

import { isApiError } from '@/lib/api/errors';

import { useConfirmActivation } from '../api';
import { NewPasswordForm } from './new-password-form';

const INVALID_LINK =
  'El enlace de activación no es válido o venció; pide a quien creó tu cuenta que reenvíe la activación.';

export function ActivationConfirmForm({
  uid,
  token,
}: {
  uid?: string;
  token?: string;
}) {
  const confirm = useConfirmActivation();
  return (
    <NewPasswordForm
      key={`${uid}:${token}`}
      uid={uid}
      token={token}
      confirm={confirm.mutateAsync}
      submitLabel="Activar cuenta"
      invalidLinkMessage={INVALID_LINK}
      invalidTokenCode="invalid_activation_token"
      successMessage="Tu cuenta fue activada. Ya puedes iniciar sesión."
      fallbackMessage="No fue posible activar tu cuenta. Revisa tu conexión e inténtalo de nuevo."
      errorMessage={(error) =>
        isApiError(error) && error.code === 'invalid_activation_token'
          ? INVALID_LINK
          : undefined
      }
    />
  );
}
