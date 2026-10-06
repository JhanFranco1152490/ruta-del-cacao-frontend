import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api/errors';

import { useMissingPageReset } from './use-missing-page-reset';

const apiError = (status: number, code: string) =>
  new ApiError(status, { detail: 'Error', code, fields: {} });
const notFound = () => apiError(404, 'not_found');

describe('useMissingPageReset', () => {
  it('goes back to the first page when a later page does not exist', () => {
    const setPage = vi.fn();

    const { result } = renderHook(() =>
      useMissingPageReset(notFound(), 3, setPage),
    );

    expect(result.current).toBe(true);
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('does nothing on the first page, even with a 404', () => {
    const setPage = vi.fn();

    const { result } = renderHook(() =>
      useMissingPageReset(notFound(), 1, setPage),
    );

    expect(result.current).toBe(false);
    expect(setPage).not.toHaveBeenCalled();
  });

  it('does nothing for other errors or no error', () => {
    const setPage = vi.fn();

    const other = renderHook(() =>
      useMissingPageReset(apiError(500, 'boom'), 2, setPage),
    );
    const none = renderHook(() => useMissingPageReset(undefined, 2, setPage));

    expect(other.result.current).toBe(false);
    expect(none.result.current).toBe(false);
    expect(setPage).not.toHaveBeenCalled();
  });
});
