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
import { hasFixedRole } from '../schemas';
import { ChevronRight } from 'lucide-react';

import {
  COMPACT_TABLE_CLASS,
  ROW_LINK_CLASS,
} from '@/components/compact-table-class';
import { AccountStatusBadge } from '@/components/account-status-badge';

export function AccountTable({
  accounts,
  open,
  municipalityName,
  showProducer = false,
  showFarms = false,
}: {
  accounts: Account[];
  open: (id: string) => void;
  // Quien no tiene un productor propio ve de qué productor es cada cuenta.
  showProducer?: boolean;
  // En el espacio del productor, en qué fincas trabaja cada quien.
  showFarms?: boolean;
  // Solo la asociación ve cuentas de varios productores: sin esto no hay columna de municipio.
  municipalityName?: (code: string) => string;
}) {
  return (
    <Table className={COMPACT_TABLE_CLASS}>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Roles</TableHead>
          {showProducer && <TableHead>Productor</TableHead>}
          {showFarms && <TableHead>Fincas</TableHead>}
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
            <TableCell className="max-w-64 min-w-0 font-bold break-words whitespace-normal max-md:order-1 max-md:col-span-1! max-md:text-base! max-md:text-foreground">
              {account.first_name} {account.last_name}
            </TableCell>
            <TableCell className="max-md:order-5 max-md:col-span-1! max-md:whitespace-nowrap!">
              <MaskedValue
                value={account.identity_document}
                prefix={account.document_type}
              />
            </TableCell>
            <TableCell className="max-w-64 break-words whitespace-normal max-md:order-4 max-md:empty:hidden">
              {account.roles.map((role) => role.name).join(', ')}
            </TableCell>
            {showProducer && (
              <TableCell className="max-w-64 break-words whitespace-normal max-md:order-3">
                {account.producer
                  ? `${account.producer.first_name} ${account.producer.last_name} · ${account.producer.member_code}`
                  : 'Asociación'}
              </TableCell>
            )}
            {showFarms && (
              <TableCell
                className="max-w-64 break-words whitespace-normal"
                data-label="Fincas"
              >
                {account.all_farms && !hasFixedRole(account) ? (
                  'Todas'
                ) : account.farms.length ? (
                  account.farms.map((farm) => farm.name).join(', ')
                ) : account.needs_farm ? (
                  <span className="font-bold text-warn">Sin asignar</span>
                ) : (
                  '—'
                )}
              </TableCell>
            )}
            {municipalityName && (
              <TableCell className="max-md:order-6 max-md:col-span-1! max-md:justify-self-end">
                {account.producer
                  ? municipalityName(account.producer.municipality_code)
                  : '—'}
              </TableCell>
            )}
            <TableCell className="max-md:order-2 max-md:col-span-1! max-md:justify-self-end">
              <AccountStatusBadge account={account} />
            </TableCell>
            <TableCell className="max-md:order-7">
              <Button
                variant="outline"
                aria-label={`Ver cuenta de ${account.first_name} ${account.last_name}`}
                className={ROW_LINK_CLASS}
                onClick={() => open(account.id)}
              >
                <span className="max-md:sr-only">Ver cuenta</span>
                <ChevronRight aria-hidden="true" className="md:hidden" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
