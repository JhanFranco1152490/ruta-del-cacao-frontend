import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useObjectUrl } from './use-object-url';

// jsdom no crea direcciones para archivos en memoria.
const create = vi.fn<(blob: Blob) => string>();
const revoke = vi.fn<(url: string) => void>();

beforeEach(() => {
  let next = 0;
  create.mockImplementation(() => `blob:foto-${(next += 1)}`);
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke }),
  );
});

afterEach(() => {
  create.mockReset();
  revoke.mockReset();
});

describe('useObjectUrl', () => {
  it('gives an address for the file and frees it when the file changes or it unmounts', () => {
    const first = new Blob(['a']);
    const second = new Blob(['b']);
    const { result, rerender, unmount } = renderHook(
      ({ blob }) => useObjectUrl(blob),
      { initialProps: { blob: first as Blob | undefined } },
    );
    expect(result.current).toBe('blob:foto-1');

    rerender({ blob: second });
    expect(revoke).toHaveBeenCalledWith('blob:foto-1');
    expect(result.current).toBe('blob:foto-2');

    unmount();
    expect(revoke).toHaveBeenCalledWith('blob:foto-2');
  });

  it('gives nothing without a file', () => {
    const { result } = renderHook(() => useObjectUrl(undefined));

    expect(result.current).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });
});
