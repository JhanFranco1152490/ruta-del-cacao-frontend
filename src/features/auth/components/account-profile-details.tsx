'use client';

import { Button } from '@/components/ui/button';
import { InlineError } from '@/components/form-message';
import { useHasConnection } from '@/hooks/use-has-connection';
import { fullName } from '@/lib/format/person-name';

import { useProfile } from '../api';

// Lo que "Mi cuenta" pide al servidor al abrirse: documento, teléfono y productor. No se guarda en
// el dispositivo, así que sin conexión solo se avisa.
export function AccountProfileDetails() {
  const hasConnection = useHasConnection();
  const profile = useProfile(hasConnection);

  if (!hasConnection && !profile.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Conéctate para ver tu documento, teléfono y productor.
      </p>
    );
  }
  if (profile.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando los datos de tu cuenta…
      </p>
    );
  }
  if (profile.isError) {
    return (
      <div className="space-y-2">
        <InlineError>No fue posible cargar los datos de tu cuenta.</InlineError>
        <Button variant="outline" onClick={() => void profile.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const { document_type, identity_document, phone, producer, farms } =
    profile.data;
  return (
    <dl className="space-y-4">
      <div>
        <dt className="text-sm text-muted-foreground">Documento</dt>
        <dd className="font-bold">
          {document_type} {identity_document}
        </dd>
      </div>
      <div>
        <dt className="text-sm text-muted-foreground">Teléfono</dt>
        <dd className="font-bold">{phone ?? 'Sin teléfono registrado'}</dd>
      </div>
      {producer && (
        <div>
          <dt className="text-sm text-muted-foreground">Productor</dt>
          <dd className="font-bold">
            {fullName(producer)} · {producer.member_code}
          </dd>
        </div>
      )}
      {farms.length > 0 && (
        <div>
          <dt className="text-sm text-muted-foreground">
            {farms.length === 1 ? 'Finca' : 'Fincas'} en las que trabajas
          </dt>
          <dd className="font-bold">
            {farms.map((farm) => farm.name).join(', ')}
          </dd>
        </div>
      )}
    </dl>
  );
}
