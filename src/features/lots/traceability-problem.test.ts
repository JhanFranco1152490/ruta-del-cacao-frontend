import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import {
  TRACEABILITY_PROBLEM_TEXT,
  traceabilityProblem,
} from './traceability-problem';

const apiError = (status: number) =>
  new ApiError(status, { detail: 'x', code: 'x', fields: {} });

describe('traceabilityProblem', () => {
  it('takes a 404 for a code that does not exist, whatever the reason', () => {
    expect(traceabilityProblem(apiError(404))).toBe('not_found');
  });

  it('takes a 429 for too many queries', () => {
    expect(traceabilityProblem(apiError(429))).toBe('too_many');
  });

  it.each([
    [apiError(500)],
    [apiError(401)],
    [new TypeError('Failed to fetch')],
  ])('takes anything else for a failed reading', (error) => {
    expect(traceabilityProblem(error)).toBe('failed');
  });

  it('says the code was not found with the words the spec asks for', () => {
    expect(TRACEABILITY_PROBLEM_TEXT.not_found.title).toBe(
      'No se encontró información para este código.',
    );
  });
});
