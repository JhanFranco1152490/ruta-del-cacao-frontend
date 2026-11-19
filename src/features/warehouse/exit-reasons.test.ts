import { describe, expect, it } from 'vitest';

import {
  DETAIL_REQUIRED_MESSAGE,
  EXIT_REASON_OPTIONS,
  exitDetailIssue,
} from './exit-reasons';

describe('EXIT_REASON_OPTIONS', () => {
  it('lists the reasons a person can choose, without the sale', () => {
    expect(EXIT_REASON_OPTIONS.map(({ label }) => label)).toEqual([
      'Merma',
      'Muestra',
      'Reproceso',
      'Traslado fuera de la finca',
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
