import type { ProducerStatus } from '../api';

const NOTES = {
  active: {
    title: 'Productor activo',
    body: 'Al desactivar este expediente también se bloqueará el acceso de su cuenta y el de sus empleados.',
  },
  inactive: {
    title: 'Productor inactivo',
    body: 'Su expediente y relaciones se conservan para mantener la trazabilidad.',
  },
} as const;

export function ProducerAccessNote({
  status,
  tile = false,
}: {
  status: ProducerStatus;
  // Como un cuadro más de la fila de resumen: más chico, sin el título grande.
  tile?: boolean;
}) {
  const note = NOTES[status];
  return (
    <aside
      className={`rounded-[var(--radius-card)] bg-card shadow-card ${tile ? 'p-3 sm:p-4' : 'p-5'}`}
    >
      <p className="section-label">Estado de acceso</p>
      <h2
        className={
          tile
            ? 'mt-1 text-lg text-selva sm:text-xl'
            : 'mt-2 text-2xl text-selva'
        }
      >
        {note.title}
      </h2>
      <p
        className={
          tile
            ? 'mt-1 text-sm text-muted-foreground max-sm:hidden'
            : 'mt-3 text-sm leading-6 text-muted-foreground'
        }
      >
        {note.body}
      </p>
    </aside>
  );
}
