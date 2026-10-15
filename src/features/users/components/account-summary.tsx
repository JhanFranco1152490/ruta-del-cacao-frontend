'use client';
import type { ReactNode } from 'react';
import { Globe, MapPin, TriangleAlert } from 'lucide-react';
import { AccountStatusBadge } from '@/components/account-status-badge';
import { useMunicipalityName } from '@/lib/api/municipalities';
import { roleScopeLabel, type RoleScope } from '@/lib/farm-scope';
import type { Account } from '../api';
import { hasFixedRole, isProducerAccount } from '../schemas';

const kindOf = (account: Account) =>
  isProducerAccount(account)
    ? 'Cuenta del productor'
    : hasFixedRole(account)
      ? 'Administrador de la asociación'
      : 'Empleado';

// La franja de arriba dice de un vistazo quién es la cuenta: nombre, correo, estado y qué clase de
// cuenta es. Llega hasta los bordes del panel (`data-band` le da su color al botón de cerrar).
export function AccountBand({ account }: { account: Account }) {
  return (
    <div
      className="bg-gradient-to-br from-selva to-selva-2 px-5 pt-5 pr-12 pb-4 text-white"
      data-band
    >
      <h2 className="font-serif text-3xl break-words">
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-[var(--radius-card)] border border-border p-4">
      <h3 className="section-label">{title}</h3>
      {children}
    </section>
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
    <Section title="Fincas en las que trabaja">
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
    </Section>
  );
}

export function AccountSections({ account }: { account: Account }) {
  const municipalityName = useMunicipalityName(Boolean(account.producer));
  const showScope = !hasFixedRole(account) && Boolean(account.producer);
  return (
    <>
      <Section title="Datos">
        <dl className="grid gap-3 sm:grid-cols-2">
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
      </Section>
      <Section title="Roles asignados">
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
      </Section>
      {showScope && <ScopeSection account={account} />}
      {account.producer?.status === 'inactive' && (
        <p className="rounded-(--radius) bg-info-bg px-3 py-2 text-sm font-bold text-info">
          El acceso está bloqueado porque el productor está inactivo.
        </p>
      )}
    </>
  );
}
