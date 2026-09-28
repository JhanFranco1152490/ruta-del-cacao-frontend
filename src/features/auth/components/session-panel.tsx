'use client';

import Link from 'next/link';

import { useSession } from '../api';

export function SessionPanel() {
  const { data: user } = useSession();

  if (!user) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
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
                  key={role.id}
                  className="rounded-full bg-ok-bg px-3 py-1 text-sm font-bold text-ok"
                >
                  {role.name}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">Sin roles asignados</span>
            )}
          </div>
        </article>
        <article className="rounded-lg border border-border bg-card p-6 shadow-card">
          <h2 className="font-serif text-2xl text-selva">Productores</h2>
          <p className="mt-3 text-muted-foreground">
            Consulta, registra y administra los productores de la asociación.
          </p>
          <Link
            href="/productores"
            className="mt-5 inline-flex rounded-md bg-selva px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-selva-2"
          >
            Ir a productores
          </Link>
        </article>
      </div>
    </section>
  );
}
