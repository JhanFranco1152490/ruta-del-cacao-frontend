import { describe, expect, it } from 'vitest';

import {
  DETAIL_REQUIRED_MESSAGE,
  EXIT_REASON_OPTIONS,
  exitDetailIssue,
  exitReasonText,
} from './exit-reasons';

describe('EXIT_REASON_OPTIONS', () => {
  it('lists the reasons a person can choose, without the sale', () => {
    expect(EXIT_REASON_OPTIONS.map(({ label }) => label)).toEqual([
      'Merma',
      'Muestra',
      'Reproceso',
      'Traslado',
      'Otro (con detalle)',
    ]);
  });
});

describe('exitDetailIssue', () => {
  it('asks for the detail only with Otro', () => {
    expect(exitDetailIssue('other', '  ')).toBe(DETAIL_REQUIRED_MESSAGE);
    expect(exitDetailIssue('other', 'Regalo a un cliente')).toBeNull();
    expect(exitDetailIssue('sample', '')).toBeNull();
  });
});

describe('exitReasonText', () => {
  it('reads the reason, and with Otro what was written', () => {
    expect(exitReasonText('sample')).toBe('Muestra');
    expect(exitReasonText('sale')).toBe('Venta');
    expect(exitReasonText('other', 'Regalo a un cliente')).toBe(
      'Regalo a un cliente',
    );
    expect(exitReasonText('other')).toBe('Otro');
  });
});
