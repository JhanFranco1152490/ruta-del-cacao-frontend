'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';

import { FarmStatusBadge } from './farm-status-badge';

export function FarmSavedPanel({
  name,
  onRegisterAnother,
}: {
  name: string;
  onRegisterAnother: () => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // El panel reemplaza al formulario: se lleva el foco al título para que el lector de
  // pantalla anuncie el resultado y el teclado no quede en un botón que ya no existe.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
      <section
        aria-labelledby="farm-saved-title"
        className="space-y-5 rounded-[var(--radius-card)] bg-card p-6 shadow-card"
      >
        <CheckCircle2 aria-hidden="true" className="size-10 text-selva" />
        <div className="space-y-2">
          <h1
            className="text-3xl text-selva outline-none"
            id="farm-saved-title"
            ref={titleRef}
            tabIndex={-1}
          >
            Finca registrada exitosamente
          </h1>
          <p className="text-muted-foreground">
            <strong className="text-foreground">{name}</strong> quedó guardada
            en este dispositivo y se enviará al servidor cuando haya conexión.
          </p>
        </div>
        <FarmStatusBadge status="pending" />
        <Button
          className="w-full sm:w-auto"
          onClick={onRegisterAnother}
          size="field"
          type="button"
          variant="outline"
        >
          Registrar otra finca
        </Button>
      </section>
    </div>
  );
}
