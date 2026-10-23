import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OfflineCopyNotice } from './offline-copy-notice';

describe('OfflineCopyNotice', () => {
  it('says the date of the copy and what cannot be done without a connection', () => {
    render(
      <OfflineCopyNotice
        consequence="Finalizar necesita conexión."
        savedAt={Date.UTC(2026, 9, 17, 13, 0)}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sin conexión: estás viendo la copia del 17 de octubre de 2026, 8:00 a.m. Finalizar necesita conexión.',
    );
  });

  it('speaks of the saved copy when its date is unknown', () => {
    render(<OfflineCopyNotice savedAt={undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Sin conexión: estás viendo la copia guardada.',
    );
  });
});
