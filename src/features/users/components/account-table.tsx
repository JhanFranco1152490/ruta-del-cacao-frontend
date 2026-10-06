import { MaskedValue } from '@/components/masked-value';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import type { Account } from '../api';
import { STACKED_TABLE_CLASS } from '@/components/stacked-table-class';
import { AccountStatusBadge } from '@/components/account-status-badge';

export function AccountTable({
  accounts,
  open,
  municipalityName,
  showProducer = false,
}: {
  accounts: Account[];
  open: (id: string) => void;
  // Quien no tiene un productor propio ve de qué productor es cada cuenta.
  showProducer?: boolean;
  // Solo la asociación ve cuentas de varios productores: sin esto no hay columna de municipio.
  municipalityName?: (code: string) => string;
}) {
  return (
    <Table className={STACKED_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Roles</TableHead>
          {showProducer && <TableHead>Productor</TableHead>}
          {municipalityName && <TableHead>Municipio</TableHead>}
          <TableHead>Estado</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map((account) => (
          <TableRow key={account.id}>
            <TableCell
              className="max-w-64 font-bold break-words whitespace-normal"
              data-label="Nombre"
            >
              {account.first_name} {account.last_name}
            </TableCell>
            <TableCell data-label="Documento">
              <MaskedValue
                value={account.identity_document}
                prefix={account.document_type}
              />
            </TableCell>
            <TableCell
              className="max-w-64 break-words whitespace-normal"
              data-label="Roles"
            >
              {account.roles.map((role) => role.name).join(', ')}
            </TableCell>
            {showProducer && (
              <TableCell
                className="max-w-64 break-words whitespace-normal"
                data-label="Productor"
              >
                {account.producer
                  ? `${account.producer.first_name} ${account.producer.last_name} · ${account.producer.member_code}`
                  : 'Asociación'}
              </TableCell>
            )}
            {municipalityName && (
              <TableCell data-label="Municipio">
                {account.producer
                  ? municipalityName(account.producer.municipality_code)
                  : '—'}
              </TableCell>
            )}
            <TableCell data-label="Estado">
              <AccountStatusBadge account={account} />
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                aria-label={`Ver cuenta de ${account.first_name} ${account.last_name}`}
                onClick={() => open(account.id)}
              >
                Ver cuenta
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
