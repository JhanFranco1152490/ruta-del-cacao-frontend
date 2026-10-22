'use client';
import { type ReactNode, useRef, useState } from 'react';
import { useIsDesktop } from '@/hooks/use-is-desktop';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  SIDE_PANEL_CLASS,
  SidePanelBody,
  SidePanelHeader,
} from '@/components/side-panel';
import { ErrorState } from '@/components/error-state';
import { ProducerFilter } from '@/components/producer-filter';
import { Button } from '@/components/ui/button';
import { useProducerSummary } from '@/lib/api/producer-options';
import { isApiError } from '@/lib/api/errors';
import { useRole, usePermissionCatalog } from '../api';
import { isRoleId } from '../schemas';
import { RoleForm } from './role-form';
import { RoleDetail } from './role-detail';

type Props = {
  selected: string;
  manage: boolean;
  canCreate: boolean;
  // La asociación elige el productor del rol nuevo dentro del panel.
  askProducer: boolean;
  producer?: string;
  close: () => void;
  open: (id: string) => void;
};
export function RolePanel(props: Props) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  function onBusy(value: boolean) {
    lock.current = value;
    setBusy(value);
  }
  const isDesktop = useIsDesktop();
  const isNew = props.selected === 'nuevo';
  return (
    <Sheet
      closeOnBack={false}
      open
      onOpenChange={(value) => {
        if (!value && !lock.current) props.close();
      }}
    >
      {/* Panel al costado en pantallas anchas y hoja desde abajo en celular. Sin relleno propio: el
          detalle trae su franja de color hasta los bordes. */}
      <SheetContent
        className={SIDE_PANEL_CLASS}
        showCloseButton={!busy}
        side={isDesktop ? 'right' : 'bottom'}
      >
        <SidePanelHeader
          band={isNew}
          description={
            isNew
              ? 'Elige el nombre, el alcance y los permisos del rol.'
              : 'Consulta los permisos y administra los roles propios.'
          }
          title={isNew ? 'Crear rol' : 'Detalle del rol'}
        />
        {props.selected === 'nuevo' ? (
          <SidePanelBody>
            {props.canCreate ? (
              <NewRole {...props} onBusy={onBusy} />
            ) : (
              <ErrorState message="No puedes crear un rol sin permiso y un productor válido." />
            )}
          </SidePanelBody>
        ) : isRoleId(props.selected) ? (
          <ExistingRole {...props} onBusy={onBusy} />
        ) : (
          <SidePanelBody>
            <ErrorState message="Rol no disponible" />
          </SidePanelBody>
        )}
      </SheetContent>
    </Sheet>
  );
}
function NewRole({
  producer,
  askProducer,
  open,
  close,
  onBusy,
}: Props & { onBusy: (value: boolean) => void }) {
  const catalog = usePermissionCatalog();
  const [chosen, setChosen] = useState(producer);
  const summary = useProducerSummary(askProducer ? chosen : undefined);
  if (askProducer && !chosen)
    return (
      <div className="space-y-5 px-4">
        <p className="text-sm text-muted-foreground">
          Los roles propios pertenecen a un productor. Elige de cuál.
        </p>
        <ProducerFilter
          producer={chosen}
          selected={summary}
          onSelect={setChosen}
          onClear={() => setChosen(undefined)}
        />
        <Button type="button" variant="outline" onClick={close}>
          Cancelar
        </Button>
      </div>
    );
  if (catalog.isPending) return <p role="status">Cargando permisos…</p>;
  if (catalog.isError)
    return (
      <ErrorState
        message="No fue posible cargar los permisos."
        onRetry={() => {
          void catalog.refetch();
        }}
      />
    );
  return (
    <RoleForm
      catalog={catalog.data}
      producer={chosen}
      producerLabel={
        askProducer && summary.data
          ? `${summary.data.first_name} ${summary.data.last_name} · ${summary.data.member_code}`
          : undefined
      }
      onChangeProducer={askProducer ? () => setChosen(undefined) : undefined}
      onBusy={onBusy}
      onSaved={(role) => open(role.id)}
      onCancel={close}
    />
  );
}
function ExistingRole({
  selected,
  manage,
  close,
  onBusy,
}: Props & { onBusy: (value: boolean) => void }) {
  const role = useRole(selected);
  const catalog = usePermissionCatalog();
  // El detalle trae su propio relleno (la franja de arriba va hasta los bordes); lo demás, no.
  const padded = (content: ReactNode) => (
    <SidePanelBody>{content}</SidePanelBody>
  );
  if (role.isError)
    return padded(
      <ErrorState
        message={
          isApiError(role.error) && [403, 404].includes(role.error.status)
            ? 'Rol no disponible'
            : 'No fue posible cargar el rol.'
        }
        onRetry={() => {
          void role.refetch();
        }}
      />,
    );
  if (catalog.isError)
    return padded(
      <ErrorState
        message="No fue posible cargar los permisos."
        onRetry={() => {
          void catalog.refetch();
        }}
      />,
    );
  if (role.isPending || catalog.isPending)
    return padded(<p role="status">Cargando rol…</p>);
  return (
    <RoleDetail
      role={role.data}
      catalog={catalog.data}
      manage={manage}
      onBusy={onBusy}
      onDeleted={close}
    />
  );
}
