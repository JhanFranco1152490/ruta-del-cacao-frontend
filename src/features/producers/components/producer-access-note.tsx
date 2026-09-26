import type { ProducerStatus } from '../api';

const NOTES = {
  active: {
    title: 'Productor activo',
    body: 'Si existe una cuenta vinculada, al desactivar este expediente también se bloqueará su acceso al sistema.',
  },
  inactive: {
    title: 'Productor inactivo',
    body: 'Su expediente y relaciones se conservan para mantener la trazabilidad.',
  },
} as const;

export function ProducerAccessNote({ status }: { status: ProducerStatus }) {
  const note = NOTES[status];
  return (
    <aside className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
      <p className="section-label">Estado de acceso</p>
      <h2 className="mt-2 text-2xl text-selva">{note.title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {note.body}
      </p>
    </aside>
  );
}
