import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildProducer } from '@/test/factories';

import type { ProducerListItem } from '../api';
import { ProducerTable } from './producer-table';

function listItem(overrides: Partial<ProducerListItem> = {}) {
  const producer = buildProducer(overrides);
  return {
    id: producer.id,
    member_code: producer.member_code,
    document_type: producer.document_type,
    identity_document: producer.identity_document,
    first_name: producer.first_name,
    last_name: producer.last_name,
    municipality_code: producer.municipality_code,
    status: producer.status,
  } satisfies ProducerListItem;
}

function renderTable() {
  return render(
    <ProducerTable
      producers={[listItem(), listItem({ id: 'p2', first_name: 'Luis' })]}
      municipalityName={() => 'Cúcuta'}
    />,
  );
}

describe('ProducerTable', () => {
  // En pantallas angostas cada fila se dibuja como una tarjeta (display distinto de table):
  // los roles explícitos mantienen la semántica de tabla para los lectores de pantalla.
  it('keeps the table semantics when the rows are drawn as cards', () => {
    renderTable();

    const table = screen.getByRole('table');
    expect(table).toHaveAttribute('role', 'table');
    expect(within(table).getAllByRole('rowgroup')).toHaveLength(2);
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(
      within(table).getByRole('columnheader', { name: 'Productor' }),
    ).toBeInTheDocument();
    expect(within(table).getAllByRole('cell').length).toBeGreaterThan(0);
  });

  it('lets the row actions wrap instead of being clipped by a narrow cell', () => {
    renderTable();

    const row = screen.getAllByRole('row')[1];
    const actions = within(row).getByRole('link', {
      name: /Ver/,
    }).parentElement;
    expect(actions).toHaveClass('flex-wrap');
  });

  it('shows every column of a row in the same card on narrow screens', () => {
    renderTable();

    const row = screen.getAllByRole('row')[1];
    expect(row).toHaveClass('max-md:grid');
  });
});
