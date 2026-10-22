'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Globe, MapPin, TriangleAlert } from 'lucide-react';
import { AccountStatusBadge } from '@/components/account-status-badge';
import { SidePanelSection } from '@/components/side-panel';
import { useSession } from '@/hooks/use-session';
import { useMunicipalityName } from '@/lib/api/municipalities';
import { roleScopeLabel, type RoleScope } from '@/lib/farm-scope';
import { producerPath } from '@/lib/paths/producers';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import type { Account } from '../api';
import { hasFixedRole, isProducerAccount } from '../schemas';

const kindOf = (account: Account) =>
  isProducerAccount(account)
    ? 'Cuenta del productor'
    : hasFixedRole(account)
      ? 'Administrador de la asociación'
      : 'Empleado';

// La franja de arriba dice de un vistazo quién es la cuenta: nombre, correo, estado y qué clase de
// cuenta es. Llega hasta los bordes del panel.
export function AccountBand({ account }: { account: Account }) {
  return (
    <div
      className="bg-gradient-to-br from-selva to-selva-2 px-5 pt-4 pr-12 pb-3 text-white sm:pt-5 sm:pb-4"
      data-band
    >
      <h2 className="font-serif text-2xl break-words sm:text-3xl">
        {account.first_name} {account.last_name}
      </h2>
      <p className="mt-1 text-sm break-all text-white/80">{account.email}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold">
        <AccountStatusBadge account={account} />
        <span className="rounded-full bg-white/20 px-3 py-1">
          {kindOf(account)}
        </span>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-bold break-words text-foreground">{children}</dd>
    </div>
  );
}

// Las fincas en las que trabaja un empleado, o todas. Sin ninguna no alcanza nada de campo: se dice.
function ScopeSection({ account }: { account: Account }) {
  return (
    <SidePanelSection title="Fincas en las que trabaja">
      {account.all_farms ? (
        <p className="flex items-start gap-2 font-bold text-foreground">
          <Globe
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-selva"
          />
          <span>
            Todas las fincas
            <span className="block text-sm font-normal text-muted-foreground">
              Incluye las que se registren después.
            </span>
          </span>
        </p>
      ) : account.farms.length ? (
        <ul className="flex flex-wrap gap-2">
          {account.farms.map((farm) => (
            <li
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-bold text-selva"
              key={farm.id}
            >
              <MapPin aria-hidden="true" className="size-4" />
              {farm.name}
              {!farm.is_active && (
                <span className="font-normal text-muted-foreground">
                  (inactiva)
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-bold text-muted-foreground">Sin asignar</p>
      )}
      {account.needs_farm && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-(--radius) bg-warn-bg px-3 py-2 text-sm font-bold text-warn"
        >
          <TriangleAlert
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          Sin fincas asignadas esta persona no ve ni registra nada de campo.
          Asígnale las fincas, o todas, con «Editar datos».
        </p>
      )}
    </SidePanelSection>
  );
}

export function AccountSections({ account }: { account: Account }) {
  const municipalityName = useMunicipalityName(Boolean(account.producer));
  const showScope = !hasFixedRole(account) && Boolean(account.producer);
  return (
    <>
      <SidePanelSection title="Datos">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact label="Teléfono">{account.phone || 'No registrado'}</Fact>
          <Fact label="Documento">
            {account.document_type} {account.identity_document}
          </Fact>
          {account.producer && (
            <>
              <Fact label="Productor">{account.producer.member_code}</Fact>
              <Fact label="Municipio">
                {municipalityName(account.producer.municipality_code)}
              </Fact>
            </>
          )}
        </dl>
      </SidePanelSection>
      <SidePanelSection title="Roles asignados">
        {account.roles.length ? (
          <ul className="space-y-2">
            {account.roles.map((role) => (
              <li
                className="flex flex-wrap items-baseline gap-x-2"
                key={role.id}
              >
                <span className="font-bold text-foreground">{role.name}</span>
                {role.farm_scope && (
                  <span className="text-sm text-muted-foreground">
                    {roleScopeLabel(role.farm_scope as RoleScope)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">Sin roles</p>
        )}
      </SidePanelSection>
      {showScope && <ScopeSection account={account} />}
      {account.producer?.status === 'inactive' && (
        <InactiveProducerNotice account={account} />
      )}
    </>
  );
}

// Con el productor inactivo la cuenta no tiene acceso. La cuenta Productor se reactiva junto con su
// productor; la de un empleado no lo reactiva, así que se lleva a la ficha del productor a quien
// puede verla.
function InactiveProducerNotice({ account }: { account: Account }) {
  const { data: user } = useSession();
  const producerId = account.producer?.id;
  return (
    <div className="space-y-1 rounded-(--radius) bg-info-bg px-3 py-2 text-sm text-info">
      <p className="font-bold">
        El acceso está bloqueado porque el productor está inactivo.
      </p>
      {isProducerAccount(account) ? (
        <p>Reactivar la cuenta también reactiva al productor.</p>
      ) : (
        <p>
          Para devolverle el acceso hay que reactivar el productor.{' '}
          {producerId && hasPermission(user, PERMISSIONS.PRODUCERS_VIEW) && (
            <Link
              className="font-bold underline"
              href={producerPath(producerId)}
            >
              Ver la ficha del productor
            </Link>
          )}
        </p>
      )}
    </div>
  );
}
