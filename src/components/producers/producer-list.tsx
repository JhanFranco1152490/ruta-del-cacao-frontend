'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  CircleX,
  ArrowLeft,
  Eye,
  Pencil,
  Search,
  UserRoundPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, getMunicipalities, getProducers } from '@/lib/producers/api';
import type {
  Municipality,
  ProducerListResponse,
  ProducerStatus,
} from '@/lib/producers/types';

const pageSize = 20;

function maskDocument(documentType: string, value: string) {
  const suffix = value.slice(-4);
  return `${documentType} ••••${suffix}`;
}

export function ProducerList() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProducerStatus | ''>('');
  const [municipalityCode, setMunicipalityCode] = useState('');
  const [page, setPage] = useState(1);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [result, setResult] = useState<ProducerListResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const normalizedSearch = searchInput.trim();
    if (normalizedSearch === search) return;

    const timer = window.setTimeout(() => {
      setPage(1);
      setIsLoading(true);
      setError('');
      setSearch(normalizedSearch);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    getMunicipalities(controller.signal)
      .then(setMunicipalities)
      .catch((requestError: unknown) => {
        if (requestError instanceof ApiError && requestError.status === 401) {
          router.replace('/');
        }
      });
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();

    getProducers(
      { search, status: status || undefined, municipalityCode, page, pageSize },
      controller.signal,
    )
      .then(setResult)
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === 'AbortError'
        )
          return;
        if (requestError instanceof ApiError && requestError.status === 401) {
          router.replace('/');
          return;
        }
        setError(
          'No fue posible cargar los productores. Inténtalo nuevamente.',
        );
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [municipalityCode, page, reload, router, search, status]);

  const totalPages = result
    ? Math.max(1, Math.ceil(result.count / pageSize))
    : 1;

  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-extrabold text-selva hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
        href="/panel"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver al panel
      </Link>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-label">Administración</p>
          <h1 className="mt-2 text-4xl text-selva">Productores asociados</h1>
          <p className="mt-2 text-muted-foreground">
            Consulta y administra los expedientes de productores de la
            asociación.
          </p>
        </div>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] bg-selva px-5 text-sm font-bold text-white hover:bg-selva-2"
          href="/producers/new"
        >
          <UserRoundPlus aria-hidden="true" className="size-5" /> Registrar
          productor
        </Link>
      </div>

      <section className="mt-8 rounded-[var(--radius-card)] bg-card p-5 shadow-card">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_190px_240px]">
          <div>
            <label className="sr-only" htmlFor="producer-search">
              Buscar productores
            </label>
            <div className="relative">
              <Search
                className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                className="h-11 border-input bg-card pl-10"
                id="producer-search"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Buscar por documento, nombre o código"
                value={searchInput}
              />
            </div>
          </div>
          <select
            className="h-11 rounded-[var(--radius)] border border-input bg-card px-3 text-sm"
            onChange={(event) => {
              setPage(1);
              setIsLoading(true);
              setError('');
              setStatus(event.target.value as ProducerStatus | '');
            }}
            value={status}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <select
            className="h-11 rounded-[var(--radius)] border border-input bg-card px-3 text-sm"
            onChange={(event) => {
              setPage(1);
              setIsLoading(true);
              setError('');
              setMunicipalityCode(event.target.value);
            }}
            value={municipalityCode}
          >
            <option value="">Todos los municipios</option>
            {municipalities.map((municipality) => (
              <option key={municipality.code} value={municipality.code}>
                {municipality.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-x-auto rounded-[var(--radius)] border border-border">
          {isLoading ? (
            <ListSkeleton />
          ) : error ? (
            <div className="p-8 text-center" role="alert">
              <p className="font-bold text-err">{error}</p>
              <Button
                className="mt-4 h-10"
                onClick={() => {
                  setIsLoading(true);
                  setError('');
                  setReload((current) => current + 1);
                }}
                variant="outline"
              >
                Reintentar
              </Button>
            </div>
          ) : result?.results.length ? (
            <table className="w-full min-w-[620px] table-fixed text-left text-sm lg:min-w-[900px]">
              <thead className="bg-surface-alt text-xs tracking-[0.1em] text-muted-foreground uppercase">
                <tr>
                  <th className="w-[34%] px-4 py-3 font-extrabold lg:w-[32%]">
                    Productor
                  </th>
                  <th className="hidden w-[20%] px-4 py-3 font-extrabold md:table-cell">
                    Documento
                  </th>
                  <th className="hidden w-[15%] px-4 py-3 font-extrabold lg:table-cell">
                    Municipio
                  </th>
                  <th className="w-[16%] px-4 py-3 font-extrabold lg:w-[15%]">
                    Estado
                  </th>
                  <th className="w-[18%] px-4 py-3 text-left font-extrabold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((producer) => (
                  <tr className="border-t border-divider" key={producer.id}>
                    <td className="px-4 py-4 font-bold">
                      <p>
                        {producer.first_name} {producer.last_name}
                      </p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {producer.member_code}
                      </p>
                    </td>
                    <td className="hidden px-4 py-4 font-medium text-muted-foreground md:table-cell">
                      {maskDocument(
                        producer.document_type,
                        producer.identity_document,
                      )}
                    </td>
                    <td className="hidden px-4 py-4 text-muted-foreground lg:table-cell">
                      {municipalities.find(
                        (item) => item.code === producer.municipality_code,
                      )?.name ?? '—'}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={producer.status} />
                    </td>
                    <td className="px-4 py-4 text-left">
                      <div className="flex justify-start gap-2">
                        <Link
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-card px-3 text-xs font-extrabold text-selva hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
                          href={`/producers/${producer.id}`}
                        >
                          <Eye aria-hidden="true" className="size-4" />
                          Ver
                          <span className="sr-only">
                            {' '}
                            ficha de {producer.first_name} {producer.last_name}
                          </span>
                        </Link>
                        <Link
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-selva px-3 text-xs font-extrabold text-white hover:bg-selva-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
                          href={`/producers/${producer.id}/edit`}
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                          Editar
                          <span className="sr-only">
                            {' '}
                            ficha de {producer.first_name} {producer.last_name}
                          </span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-10 text-center">
              <h2 className="text-2xl text-selva">
                No hay productores para mostrar
              </h2>
              <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                Ajusta los filtros o registra el primer productor asociado.
              </p>
              <Link
                className="mt-5 inline-flex h-11 items-center justify-center rounded-[var(--radius)] bg-selva px-4 text-sm font-bold text-white hover:bg-selva-2"
                href="/producers/new"
              >
                Registrar productor
              </Link>
            </div>
          )}
        </div>

        {result && result.count > pageSize && (
          <nav
            aria-label="Paginación de productores"
            className="mt-5 flex items-center justify-between gap-4"
          >
            <p className="text-sm text-muted-foreground">
              {result.count} productores encontrados
            </p>
            <div className="flex items-center gap-3">
              <Button
                className="h-10"
                disabled={page === 1}
                onClick={() => {
                  setIsLoading(true);
                  setError('');
                  setPage((current) => current - 1);
                }}
                variant="outline"
              >
                Anterior
              </Button>
              <span className="text-sm font-bold">
                Página {page} de {totalPages}
              </span>
              <Button
                className="h-10"
                disabled={page === totalPages}
                onClick={() => {
                  setIsLoading(true);
                  setError('');
                  setPage((current) => current + 1);
                }}
                variant="outline"
              >
                Siguiente
              </Button>
            </div>
          </nav>
        )}
      </section>
    </main>
  );
}

export function StatusBadge({ status }: { status: ProducerStatus }) {
  const isActive = status === 'active';
  return (
    <span
      className={
        isActive
          ? 'inline-flex items-center gap-1.5 rounded-full bg-ok-bg px-3 py-1 text-xs font-extrabold text-ok'
          : 'inline-flex items-center gap-1.5 rounded-full bg-err-bg px-3 py-1 text-xs font-extrabold text-err'
      }
    >
      {isActive ? (
        <CheckCircle2 aria-hidden="true" className="size-4" />
      ) : (
        <CircleX aria-hidden="true" className="size-4" />
      )}
      {isActive ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-px bg-divider p-px">
      {[0, 1, 2, 3].map((index) => (
        <div className="grid grid-cols-4 gap-5 bg-card p-4" key={index}>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}
