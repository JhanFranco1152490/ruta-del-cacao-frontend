import { describe, expect, it } from 'vitest';

import { reportContent } from './report-content';

const READY = {
  sessionPending: false,
  hasTypes: true,
  generated: true,
  valid: true,
  pending: false,
  notice: null,
  hasReport: true,
};

describe('reportContent', () => {
  it('shows the report once it is generated and has arrived', () => {
    expect(reportContent(READY)).toBe('report');
  });

  it('waits for the session before deciding anything', () => {
    expect(reportContent({ ...READY, sessionPending: true })).toBe('session');
  });

  it('says so when the account cannot generate any type', () => {
    expect(reportContent({ ...READY, hasTypes: false })).toBe('no-types');
  });

  // Cambiar un filtro quita el reporte: lo guardado de antes no se muestra.
  it('asks to generate while the report is not generated or the filters are wrong', () => {
    expect(reportContent({ ...READY, generated: false })).toBe('not-generated');
    expect(reportContent({ ...READY, valid: false })).toBe('not-generated');
  });

  it('shows the loading state while the report is on its way', () => {
    expect(reportContent({ ...READY, pending: true, hasReport: false })).toBe(
      'loading',
    );
  });

  it('shows the notice of a refusal that is not of a filter', () => {
    expect(
      reportContent({
        ...READY,
        notice: 'Demasiadas filas.',
        hasReport: false,
      }),
    ).toBe('error');
  });

  // El error está en el campo que lo causó.
  it('asks to generate again when a filter was refused', () => {
    expect(reportContent({ ...READY, hasReport: false })).toBe('not-generated');
  });
});
