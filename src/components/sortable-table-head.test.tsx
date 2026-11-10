import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Table, TableHeader, TableRow } from '@/components/ui/table';

import {
  nextOrdering,
  SortableTableHead,
  sortDirectionOf,
} from './sortable-table-head';

describe('sortDirectionOf', () => {
  it('reads the direction of the column from the ordering', () => {
    expect(sortDirectionOf('quantity', 'quantity')).toBe('ascending');
    expect(sortDirectionOf('quantity', '-quantity')).toBe('descending');
    expect(sortDirectionOf('quantity', '-entry_date')).toBe('none');
    expect(sortDirectionOf('quantity', null)).toBe('none');
  });
});

describe('nextOrdering', () => {
  it('flips the column already in use and starts another one ascending', () => {
    expect(nextOrdering('quantity', 'quantity')).toBe('-quantity');
    expect(nextOrdering('quantity', '-quantity')).toBe('quantity');
    expect(nextOrdering('quantity', '-entry_date')).toBe('quantity');
    expect(nextOrdering('quantity', null)).toBe('quantity');
  });
});

const renderHead = (ordering: string | null, onSort = vi.fn()) => {
  render(
    <Table>
      <TableHeader>
        <TableRow>
          <SortableTableHead
            field="quantity"
            label="Kilos"
            onSort={onSort}
            ordering={ordering}
          />
        </TableRow>
      </TableHeader>
    </Table>,
  );
  return onSort;
};

describe('SortableTableHead', () => {
  it('tells the screen reader how the column is sorted', () => {
    renderHead('-quantity');

    expect(screen.getByRole('columnheader', { name: 'Kilos' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('asks for the next ordering when touched', async () => {
    const onSort = renderHead('quantity');

    await userEvent.click(screen.getByRole('button', { name: 'Kilos' }));

    expect(onSort).toHaveBeenCalledWith('-quantity');
  });
});
