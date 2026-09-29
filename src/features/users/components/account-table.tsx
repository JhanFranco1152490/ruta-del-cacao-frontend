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
import { AccountStatusBadge } from '@/components/account-status-badge';

export function AccountTable({
  accounts,
  open,
  municipalityName,
}: {
  accounts: Account[];
  open: (id: string) => void;
  // Solo la asociación ve cuentas de varios productores: sin esto no hay columna de municipio.
  municipalityName?: (code: string) => string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Roles</TableHead>
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
            <TableCell className="max-w-64 font-bold break-words whitespace-normal">
              {account.first_name} {account.last_name}
            </TableCell>
            <TableCell>
              <MaskedValue
                value={account.identity_document}
                prefix={account.document_type}
              />
            </TableCell>
            <TableCell className="max-w-64 break-words whitespace-normal">
              {account.roles.map((role) => role.name).join(', ')}
            </TableCell>
            {municipalityName && (
              <TableCell>
                {account.producer
                  ? municipalityName(account.producer.municipality_code)
                  : '—'}
              </TableCell>
            )}
            <TableCell>
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
