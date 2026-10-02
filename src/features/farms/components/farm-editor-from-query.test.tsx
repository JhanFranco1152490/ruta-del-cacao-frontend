import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let search = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => search }));
vi.mock('./farm-editor-screen', () => ({
  FarmEditorScreen: ({ id }: { id: string }) => <p>Editor de {id}</p>,
}));

import { FarmEditorFromQuery } from './farm-editor-from-query';

describe('FarmEditorFromQuery', () => {
  it('opens the editor of the farm in the address', () => {
    search = new URLSearchParams('id=f1');
    render(<FarmEditorFromQuery />);

    expect(screen.getByText('Editor de f1')).toBeInTheDocument();
  });

  it('explains that no farm was given', () => {
    search = new URLSearchParams();
    render(<FarmEditorFromQuery />);

    expect(
      screen.getByText('No se indicó qué finca editar.'),
    ).toBeInTheDocument();
  });
});
