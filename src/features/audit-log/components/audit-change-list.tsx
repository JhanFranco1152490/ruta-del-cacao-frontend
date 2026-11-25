'use client';

import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';

import type { AuditChange } from '../api';
import { moreChangesLabel, splitChanges } from '../visible-changes';
import { AuditChangeItem } from './audit-change-item';

// Los campos que cambiaron, uno por línea. Con muchos, los primeros y un botón que despliega el
// resto, para que una fila no alargue la tabla.
export function AuditChangeList({ changes }: { changes: AuditChange[] }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  if (changes.length === 0) return null;
  const { shown, rest } = splitChanges(changes);
  const visible = open ? changes : shown;

  return (
    <div className="space-y-1">
      <ul className="space-y-0.5" id={listId}>
        {visible.map((change) => (
          <AuditChangeItem change={change} key={change.field} />
        ))}
      </ul>
      {rest.length > 0 && (
        <Button
          aria-controls={listId}
          aria-expanded={open}
          className="h-auto px-0 py-0.5 text-sm"
          onClick={() => setOpen((value) => !value)}
          type="button"
          variant="link"
        >
          {open ? 'Ver menos' : moreChangesLabel(rest.length)}
        </Button>
      )}
    </div>
  );
}
