import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import {
  buildAuditChange,
  buildAuditEntries,
  buildAuditEntry,
} from '@/test/factories';

import { AuditTable } from './audit-table';

const rowOf = (text: string) => {
  const row = screen.getByText(text).closest('tr');
  if (!row) throw new Error(`Sin fila para ${text}`);
  return row;
};

// Lo que oye el lector de pantalla: sin lo que está oculto para él (la flecha).
const spokenText = (element: Element | null) => {
  const copy = element?.cloneNode(true) as Element | undefined;
  copy
    ?.querySelectorAll('[aria-hidden="true"]')
    .forEach((node) => node.remove());
  return copy?.textContent?.replace(/\s+/g, ' ').trim();
};

describe('AuditTable', () => {
  it('shows each entry in the order it came, newest first', () => {
    render(<AuditTable entries={buildAuditEntries()} />);

    const rows = within(
      screen.getByRole('table', { name: 'Bitácora de cambios' }),
    )
      .getAllByRole('row')
      .slice(1);
    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent('Cosecha corregida');
    expect(rows[6]).toHaveTextContent('Cuenta activada');
  });

  it('says when, who, which record and what action', () => {
    render(<AuditTable entries={[buildAuditEntry()]} />);

    const row = rowOf('Cosecha corregida');
    expect(row).toHaveTextContent('20/11/2026 a las 10:42');
    expect(row).toHaveTextContent('Luis Ejemplo');
    expect(row).toHaveTextContent('Cosecha');
    expect(row).toHaveTextContent('Cosecha del 14/11/2026 · P01');
  });

  it('shows the previous value struck through and the new one, also for a screen reader', () => {
    render(<AuditTable entries={[buildAuditEntry()]} />);

    const weight = screen.getByText('Peso en verde (kg):').closest('li');
    expect(spokenText(weight)).toBe(
      'Peso en verde (kg): antes 120,5, ahora 125,0',
    );
    expect(within(weight!).getByText('120,5').closest('del')).not.toBeNull();
    expect(within(weight!).getByText('125,0').closest('ins')).not.toBeNull();
    expect(spokenText(screen.getByText('Recolector:').closest('li'))).toBe(
      'Recolector: antes Luis Ejemplo, ahora Ana Ejemplo',
    );
  });

  it('shows only the new value of a new record and only the old one of a deleted record', () => {
    render(<AuditTable entries={buildAuditEntries()} />);

    const created = within(rowOf('Bodega creada')).getByText('Nombre:');
    expect(created.closest('li')).toHaveTextContent('Nombre: Bodega principal');
    expect(created.closest('li')?.querySelector('del')).toBeNull();

    const deleted = within(rowOf('Insumo eliminado'))
      .getByText('Nombre:')
      .closest('li');
    expect(deleted?.querySelector('del')).toHaveTextContent('Abono orgánico');
    expect(deleted?.querySelector('ins')).toBeNull();
  });

  it('marks a deleted record and keeps its name', () => {
    render(<AuditTable entries={buildAuditEntries()} />);

    const row = rowOf('Insumo eliminado');
    expect(row).toHaveTextContent('Abono orgánico');
    expect(within(row).getByText('Eliminado')).toBeInTheDocument();
    expect(
      within(rowOf('Cosecha corregida')).queryByText('Eliminado'),
    ).toBeNull();
  });

  it('says what changed without the values that are not shown', () => {
    render(<AuditTable entries={buildAuditEntries()} />);

    expect(
      within(rowOf('Comprador actualizado'))
        .getByText('Teléfono:')
        .closest('li'),
    ).toHaveTextContent('Teléfono: modificado');
    expect(
      within(rowOf('Finca actualizada')).getByText('Nombre:').closest('li'),
    ).toHaveTextContent('Nombre: modificado (valor no registrado)');
    const plot = rowOf('Parcela actualizada');
    expect(within(plot).getByText('Polígono:').closest('li')).toHaveTextContent(
      'Polígono: modificado',
    );
    expect(spokenText(within(plot).getByText('Área (ha):').closest('li'))).toBe(
      'Área (ha): antes 1,20, ahora 1,35',
    );
  });

  it('says the account was deleted when there is no user', () => {
    render(<AuditTable entries={buildAuditEntries()} />);

    expect(rowOf('Parcela actualizada')).toHaveTextContent('Cuenta eliminada');
  });

  it('shows only the action of an entry without fields', () => {
    render(<AuditTable entries={buildAuditEntries()} />);

    expect(within(rowOf('Cuenta activada')).queryByRole('list')).toBeNull();
  });

  it('folds the changes after the third and unfolds them on request', async () => {
    const user = userEvent.setup();
    const changes = Array.from({ length: 6 }, (_, index) =>
      buildAuditChange({ field: `f${index}`, label: `Campo ${index + 1}` }),
    );
    render(<AuditTable entries={[buildAuditEntry({ changes })]} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    const more = screen.getByRole('button', { name: 'Ver 3 cambios más' });
    expect(more).toHaveAttribute('aria-expanded', 'false');

    await user.click(more);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    const less = screen.getByRole('button', { name: 'Ver menos' });
    expect(less).toHaveAttribute('aria-expanded', 'true');

    await user.click(less);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
