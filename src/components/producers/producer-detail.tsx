'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CircleOff, Pencil, UserRoundCheck, UserRoundX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ApiError,
  changeProducerStatus,
  getProducer,
} from '@/lib/producers/api';
import type { Producer, ProducerStatus } from '@/lib/producers/types';

import { ProducerForm } from './producer-form';
import { StatusBadge } from './producer-list';

function maskValue(value: string) {
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(
    new Date(`${value}T12:00:00`),
  );
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return 'No fue posible cargar la ficha del productor.';
}

export function ProducerDetail({ id }: { id: string }) {
  const [producer, setProducer] = useState<Producer | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    getProducer(id, controller.signal)
      .then((response) => {
        setError('');
        setProducer(response);
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === 'AbortError'
        )
          return;
        setError(errorMessage(requestError));
      });

    return () => controller.abort();
  }, [id]);

  if (error) {
    return <ProducerPageError message={error} />;
  }

  if (!producer) {
    return <DetailSkeleton />;
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-8">
      <Link
        className="text-sm font-bold text-selva-2 hover:underline"
        href="/producers"
      >
        ← Volver a productores
      </Link>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label">Ficha del productor</p>
          <h1 className="mt-2 text-4xl text-selva">
            {producer.first_name} {producer.last_name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Código de asociado: {producer.member_code}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-input bg-card px-4 text-sm font-bold hover:bg-muted"
            href={`/producers/${producer.id}/edit`}
          >
            <Pencil aria-hidden="true" className="size-4" /> Editar datos
          </Link>
          <ChangeProducerStatus
            producer={producer}
            onUpdated={setProducer}
            target={producer.status === 'active' ? 'inactive' : 'active'}
          />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-label">Datos del productor</p>
              <h2 className="mt-2 text-2xl text-selva">
                Información registrada
              </h2>
            </div>
            <StatusBadge status={producer.status} />
          </div>
          <dl className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <DataItem
              label="Documento"
              value={`${producer.document_type} ${maskValue(producer.identity_document)}`}
            />
            <DataItem
              label="Teléfono"
              value={
                producer.phone ? maskValue(producer.phone) : 'Sin registrar'
              }
            />
            <DataItem
              label="Correo electrónico"
              value={
                producer.email ? maskValue(producer.email) : 'Sin registrar'
              }
            />
            <DataItem label="Municipio" value={producer.municipality_code} />
            <DataItem
              label="Vinculado desde"
              value={displayDate(producer.joined_on)}
            />
            <DataItem label="Código de asociado" value={producer.member_code} />
          </dl>
          <p className="mt-6 rounded-[var(--radius)] bg-info-bg px-4 py-3 text-sm font-medium text-info">
            Los datos sensibles se muestran protegidos en esta ficha. La
            consulta completa será controlada por la bitácora general.
          </p>
        </section>

        <aside className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
          <p className="section-label">Estado de acceso</p>
          {producer.status === 'active' ? (
            <>
              <h2 className="mt-2 text-2xl text-selva">Productor activo</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Si existe una cuenta vinculada, al desactivar este expediente
                también se bloqueará su acceso al sistema.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-2 text-2xl text-selva">Productor inactivo</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Su expediente y relaciones se conservan para mantener la
                trazabilidad.
              </p>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

export function ProducerEditor({ id }: { id: string }) {
  const [producer, setProducer] = useState<Producer | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getProducer(id, controller.signal)
      .then(setProducer)
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === 'AbortError'
        )
          return;
        setError(errorMessage(requestError));
      });
    return () => controller.abort();
  }, [id]);

  if (error) return <ProducerPageError message={error} />;
  if (!producer) return <DetailSkeleton />;

  return <ProducerForm producer={producer} />;
}

const statusActions = {
  inactive: {
    trigger: 'Desactivar',
    title: '¿Desactivar productor?',
    description:
      'El expediente conservará su historial. Si tiene una cuenta vinculada, también se bloqueará su acceso al sistema.',
    confirm: 'Desactivar productor',
    pending: 'Desactivando…',
    triggerClassName: undefined,
    Icon: UserRoundX,
    variant: 'destructive',
  },
  active: {
    trigger: 'Reactivar',
    title: '¿Reactivar productor?',
    description:
      'El productor volverá a figurar como activo y su expediente podrá editarse con normalidad.',
    confirm: 'Reactivar productor',
    pending: 'Reactivando…',
    triggerClassName: 'bg-selva hover:bg-selva-2',
    Icon: UserRoundCheck,
    variant: 'default',
  },
} as const;

function ChangeProducerStatus({
  onUpdated,
  producer,
  target,
}: {
  onUpdated: (producer: Producer) => void;
  producer: Producer;
  target: ProducerStatus;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const action = statusActions[target];

  async function changeStatus() {
    setIsSaving(true);
    setError('');
    try {
      const updatedProducer = await changeProducerStatus(
        producer.id,
        target,
        producer.version,
      );
      setIsOpen(false);
      onUpdated(updatedProducer);
      router.refresh();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger
        render={
          <Button
            className={`h-11 ${action.triggerClassName ?? ''}`}
            variant={action.variant}
          />
        }
      >
        <action.Icon aria-hidden="true" className="size-4" /> {action.trigger}
      </DialogTrigger>
      <DialogContent showCloseButton={!isSaving}>
        <DialogHeader>
          <DialogTitle>{action.title}</DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm font-bold text-err" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <DialogClose
            disabled={isSaving}
            render={<Button variant="outline" />}
          >
            Cancelar
          </DialogClose>
          <Button
            className={action.triggerClassName}
            disabled={isSaving}
            onClick={changeStatus}
            variant={action.variant}
          >
            {isSaving ? action.pending : action.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-bold break-words text-foreground">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-8 sm:px-8">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-11 w-80" />
      <Skeleton className="h-72 w-full" />
    </main>
  );
}

function ProducerPageError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-8">
      <CircleOff aria-hidden="true" className="mx-auto size-10 text-err" />
      <h1 className="mt-4 text-3xl text-selva">
        No fue posible abrir la ficha
      </h1>
      <p className="mt-3 text-muted-foreground" role="alert">
        {message}
      </p>
      <Link
        className="mt-6 inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-selva px-4 text-sm font-bold text-white hover:bg-selva-2"
        href="/producers"
      >
        Volver a productores
      </Link>
    </main>
  );
}
