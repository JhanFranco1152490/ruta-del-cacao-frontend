'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CacaoMark } from '@/components/brand/cacao-mark';
import { getCurrentUser, logout, type User } from '@/lib/auth';

export function SessionPanel() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) router.replace('/');
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogout() {
    setPending(true);
    try {
      await logout();
    } finally {
      router.replace('/');
    }
  }

  if (pending && !user) {
    return (
      <main
        className="grid min-h-screen place-items-center bg-[var(--cream)]"
        role="status"
      >
        <div className="text-center text-[var(--forest)]">
          <CacaoMark className="mx-auto h-14 w-10 animate-pulse text-[var(--copper)]" />
          <p className="mt-4 font-bold">Validando tu sesión…</p>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[var(--cream)] px-5 py-8 sm:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-3 text-[var(--forest)]">
          <CacaoMark className="h-10 w-7 text-[var(--copper)]" />
          <span className="font-[family-name:var(--font-cormorant)] text-2xl font-bold">
            Ruta del Cacao
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={pending}
          className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold text-[var(--copper)] hover:bg-[#fbf5ed] disabled:opacity-60"
        >
          Cerrar sesión
        </button>
      </header>
      <section className="mx-auto max-w-6xl py-14">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--copper)]">
          Sesión activa
        </p>
        <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-cormorant)] text-4xl font-bold text-[var(--forest)] sm:text-5xl">
          Bienvenido a Ruta del Cacao
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Tu cuenta está lista. Los módulos disponibles aparecerán aquí a medida
          que se habiliten para tus roles y permisos.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6 shadow-[0_14px_40px_rgba(35,24,18,0.06)]">
            <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold text-[var(--forest)]">
              Cuenta
            </h2>
            <p className="mt-3 break-all text-[var(--muted)]">{user.email}</p>
          </article>
          <article className="rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-6 shadow-[0_14px_40px_rgba(35,24,18,0.06)]">
            <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-bold text-[var(--forest)]">
              Roles asignados
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.roles.length ? (
                user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-[#e8f1ec] px-3 py-1 text-sm font-bold text-[var(--success)]"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-[var(--muted)]">Sin roles asignados</span>
              )}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
