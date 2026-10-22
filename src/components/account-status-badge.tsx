import { StatusBadge } from '@/components/status-badge';
import type { Account } from '@/lib/api/accounts';

// En celular, una fila de lista no tiene sitio para el texto largo: con `shortOnPhone` el estado se
// ve abreviado (los lectores de pantalla siguen oyendo el texto completo).
function Label({
  long,
  short,
  shortOnPhone,
}: {
  long: string;
  short: string;
  shortOnPhone: boolean;
}) {
  if (!shortOnPhone) return <>{long}</>;
  return (
    <>
      <span className="max-md:sr-only">{long}</span>
      <span aria-hidden="true" className="md:hidden">
        {short}
      </span>
    </>
  );
}

export function AccountStatusBadge({
  account,
  shortOnPhone = false,
}: {
  account: Pick<Account, 'status' | 'activation_pending'> & {
    producer?: Account['producer'];
  };
  shortOnPhone?: boolean;
}) {
  // Sin el productor activo la cuenta no tiene acceso, aunque esté activa: se dice el motivo.
  if (account.producer?.status === 'inactive')
    return (
      <StatusBadge tone="err">
        <Label
          long="Inactiva · productor inactivo"
          short="Inactiva"
          shortOnPhone={shortOnPhone}
        />
      </StatusBadge>
    );
  if (account.status === 'inactive')
    return <StatusBadge tone="err">Inactiva</StatusBadge>;
  if (account.activation_pending)
    return (
      <StatusBadge tone="warn">
        <Label
          long="Pendiente de activación"
          short="Por activar"
          shortOnPhone={shortOnPhone}
        />
      </StatusBadge>
    );
  return <StatusBadge tone="ok">Activa</StatusBadge>;
}
