// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { dataUrlToBlob, qrFileName, qrSvgDataUrl, qrSvgText } from './qr-files';

const URL = 'https://app.example.com/trazabilidad/Xq3k9Lm2Pz7tRw1a';

describe('qrFileName', () => {
  it('names the file after the lot so it is easy to find among the downloads', () => {
    expect(qrFileName('000123-F02-P05-261014-1', 'png')).toBe(
      'qr-000123-F02-P05-261014-1.png',
    );
    expect(qrFileName('000123-F02-P05-261014-1', 'svg')).toBe(
      'qr-000123-F02-P05-261014-1.svg',
    );
  });
});

describe('qrSvgText', () => {
  it('draws a vector image that scales to any print size', async () => {
    const svg = await qrSvgText(URL);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox');
  });

  it('draws the same code for the same address', async () => {
    expect(await qrSvgText(URL)).toBe(await qrSvgText(URL));
  });

  it('draws a different code for another address', async () => {
    expect(await qrSvgText(URL)).not.toBe(
      await qrSvgText(`${URL.slice(0, -1)}b`),
    );
  });
});

describe('qrSvgDataUrl', () => {
  it('turns the drawing into an address an image can load, without markup injection', () => {
    const url = qrSvgDataUrl('<svg><path d="M0 0"/></svg>');
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(url).not.toContain('<');
  });
});

describe('dataUrlToBlob', () => {
  it('turns the data address of a PNG into a file of the same type and bytes', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,iVBORw0KGgo=');
    expect(blob.type).toBe('image/png');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });

  it('refuses something that is not a base64 data address', () => {
    expect(() => dataUrlToBlob('https://example.com/x.png')).toThrow();
  });
});
