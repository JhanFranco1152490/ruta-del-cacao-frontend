'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CacaoMark } from '@/components/brand/cacao-mark';
import { ApiError, getCurrentUser, logout, type User } from '@/lib/auth';

export function SessionPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace('/');
        } else {
          setError(
            'No pudimos validar tu sesión. Revisa la conexión e inténtalo de nuevo.',
          );
        }
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [router, attempt]);

  async function handleLogout() {
    setPending(true);
    setError('');
    try {
      await logout();
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace('/');
      } else {
        setError(
          'No pudimos cerrar tu sesión. Revisa la conexión e inténtalo de nuevo.',
        );
      }
    } finally {
      setPending(false);
    }
  }

  if (pending && !user) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-background"
        role="status"
      >
        <div className="text-center text-selva">
          <CacaoMark className="mx-auto h-14 w-10 animate-pulse text-cobre" />
          <p className="mt-4 font-bold">Validando tu sesión…</p>
        </div>
      </main>
    );
  }

  if (!user)
    return error ? (
      <main className="grid min-h-screen place-items-center bg-background px-5">
        <div className="text-center text-selva">
          <p role="alert">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-md border px-4 py-2 font-bold"
            onClick={() => {
              setError('');
              setPending(true);
              setAttempt((value) => value + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      </main>
    ) : null;

  return (
    <main className="min-h-screen bg-background px-5 py-8 sm:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-3 text-selva">
          <CacaoMark className="h-10 w-7 text-cobre" />
          <span className="font-serif text-2xl">Ruta del Cacao</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={pending}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-bold text-cobre hover:bg-surface-alt disabled:opacity-60"
        >
          Cerrar sesión
        </button>
      </header>
      <section className="mx-auto max-w-6xl py-14">
        {error && (
          <p role="alert" className="mb-6 text-cobre">
            {error}
          </p>
        )}
        <p className="section-label">Sesión activa</p>
        <h1 className="mt-3 max-w-2xl font-serif text-4xl text-selva sm:text-5xl">
          Bienvenido a Ruta del Cacao
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          Tu cuenta está lista. Los módulos disponibles aparecerán aquí a medida
          que se habiliten para tus roles y permisos.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-lg border border-border bg-card p-6 shadow-card">
            <h2 className="font-serif text-2xl text-selva">Cuenta</h2>
            <p className="mt-3 break-all text-muted-foreground">{user.email}</p>
          </article>
          <article className="rounded-lg border border-border bg-card p-6 shadow-card">
            <h2 className="font-serif text-2xl text-selva">Roles asignados</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.roles.length ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-ok-bg px-3 py-1 text-sm font-bold text-ok"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground">
                  Sin roles asignados
                </span>
              )}
            </div>
          </article>
          <article className="rounded-lg border border-border bg-card p-6 shadow-card">
            <h2 className="font-serif text-2xl text-selva">Productores</h2>
            <p className="mt-3 text-muted-foreground">
              Consulta, registra y administra los productores de la asociación.
            </p>
            <Link
              href="/producers"
              className="mt-5 inline-flex rounded-md bg-selva px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-selva-2"
            >
              Ir a productores
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
