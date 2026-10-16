import { describe, expect, it } from 'vitest';

import { assignedCodeNotice } from './assigned-code-notice';

describe('assignedCodeNotice', () => {
  it('names the plot and the code it got', () => {
    expect(
      assignedCodeNotice('plot', [{ code: 'P05', name: 'Lote del río' }]),
    ).toBe('La parcela Lote del río quedó con el código P05');
  });

  it('calls a plot without a name a new plot', () => {
    expect(assignedCodeNotice('plot', [{ code: 'P05', name: null }])).toBe(
      'La parcela nueva quedó con el código P05',
    );
  });

  it('names the farm and the code it got', () => {
    expect(
      assignedCodeNotice('farm', [{ code: 'F03', name: 'La Esperanza' }]),
    ).toBe('La finca La Esperanza quedó con el código F03');
  });

  it('lists several in one notice', () => {
    expect(
      assignedCodeNotice('plot', [
        { code: 'P05', name: 'Lote del río' },
        { code: 'P06', name: 'La loma' },
        { code: 'P07', name: null },
      ]),
    ).toBe(
      '3 parcelas recibieron su código: P05 · Lote del río, P06 · La loma y P07',
    );
    expect(
      assignedCodeNotice('farm', [
        { code: 'F03', name: 'La Esperanza' },
        { code: 'F04', name: 'El Diviso' },
      ]),
    ).toBe(
      '2 fincas recibieron su código: F03 · La Esperanza y F04 · El Diviso',
    );
  });
});
