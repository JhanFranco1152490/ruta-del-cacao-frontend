'use client';

import { useConfirmPasswordReset } from '../api';
import { NewPasswordForm } from './new-password-form';

export function ResetConfirmForm({
  uid,
  token,
}: {
  uid?: string;
  token?: string;
}) {
  const confirm = useConfirmPasswordReset();
  return (
    <NewPasswordForm
      key={`${uid}:${token}`}
      uid={uid}
      token={token}
      confirm={confirm.mutateAsync}
      submitLabel="Actualizar contraseña"
      invalidLinkMessage="El enlace de recuperación no es válido. Solicita uno nuevo."
      invalidTokenCode="invalid_reset_token"
      successMessage="Tu contraseña fue actualizada. Ya puedes iniciar sesión."
      fallbackMessage="El enlace no es válido o venció. Solicita uno nuevo."
      recovery
    />
  );
}
