import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveFile, temporaryObjectUrl } from './save-file';

describe('saving a downloaded file', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:report');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('clicks a link to the file with its name', () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.href).toBe('blob:report');
        expect(this.download).toBe('reporte-produccion-2026-11-13.csv');
      });

    saveFile(new Blob(['a,b']), 'reporte-produccion-2026-11-13.csv');

    expect(click).toHaveBeenCalledOnce();
  });

  it('frees the link a while after using it', () => {
    temporaryObjectUrl(new Blob(['a,b']));

    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
  });
});
