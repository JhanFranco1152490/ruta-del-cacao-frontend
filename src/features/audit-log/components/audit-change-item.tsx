import type { AuditChange } from '../api';
import { changeLine } from '../audit-change-line';

const BEFORE_CLASS = 'text-muted-foreground line-through decoration-1';
const AFTER_CLASS = 'font-bold no-underline';

// Un campo que cambió: «Etiqueta: anterior → nuevo», con el anterior tachado y tenue y el nuevo
// firme. La flecha no se lee; el lector de pantalla oye «antes …, ahora …».
export function AuditChangeItem({ change }: { change: AuditChange }) {
  const line = changeLine(change);
  return (
    <li className="break-words">
      <span className="text-muted-foreground">{line.label}:</span>{' '}
      {line.note && <span className="italic">{line.note}</span>}
      {line.before !== null && (
        <>
          {line.after !== null && <span className="sr-only">antes </span>}
          <del className={BEFORE_CLASS}>{line.before}</del>
        </>
      )}
      {line.before !== null && line.after !== null && (
        <>
          <span aria-hidden="true" className="mx-1 text-muted-foreground">
            →
          </span>
          <span className="sr-only">, ahora </span>
        </>
      )}
      {line.after !== null && <ins className={AFTER_CLASS}>{line.after}</ins>}
    </li>
  );
}
