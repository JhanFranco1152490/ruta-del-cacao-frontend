import { afterEach, describe, expect, it, vi } from 'vitest';

import { copyText } from './copy-text';
import { notify } from './notify';

vi.mock('./notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const MESSAGES = { success: 'Enlace copiado', failure: 'No se pudo copiar.' };

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
}

describe('copyText', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('copies the text and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    await copyText('https://example.com/x', MESSAGES);
    expect(writeText).toHaveBeenCalledWith('https://example.com/x');
    expect(notify.success).toHaveBeenCalledWith('Enlace copiado');
    expect(notify.error).not.toHaveBeenCalled();
  });

  it('tells the person to copy it by hand when the browser refuses', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    await copyText('abc', MESSAGES);
    expect(notify.error).toHaveBeenCalledWith('No se pudo copiar.');
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('tells the person when the browser has no clipboard at all', async () => {
    vi.stubGlobal('navigator', {});
    await copyText('abc', MESSAGES);
    expect(notify.error).toHaveBeenCalledWith('No se pudo copiar.');
  });
});
