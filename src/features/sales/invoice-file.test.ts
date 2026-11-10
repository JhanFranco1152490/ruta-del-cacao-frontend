import { describe, expect, it } from 'vitest';

import { MAX_UPLOAD_BYTES } from '@/lib/files/upload-limits';

import {
  fileSizeText,
  INVOICE_FILE_MESSAGE,
  invoiceFileIssue,
} from './invoice-file';

const file = (name: string, type: string, size = 300 * 1024) => ({
  name,
  type,
  size,
});

describe('invoiceFileIssue', () => {
  it('accepts a PDF, a JPG or a PNG of up to 5 MB', () => {
    expect(invoiceFileIssue(file('factura.pdf', 'application/pdf'))).toBeNull();
    expect(invoiceFileIssue(file('factura.jpg', 'image/jpeg'))).toBeNull();
    expect(
      invoiceFileIssue(file('factura.png', 'image/png', MAX_UPLOAD_BYTES)),
    ).toBeNull();
  });

  it('goes by the extension when the phone does not say the type', () => {
    expect(invoiceFileIssue(file('factura.PDF', ''))).toBeNull();
    expect(invoiceFileIssue(file('factura.docx', ''))).toBe(
      INVOICE_FILE_MESSAGE,
    );
  });

  it('refuses another format, even with a PDF name', () => {
    expect(
      invoiceFileIssue(
        file(
          'factura.docx',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ),
      ),
    ).toBe(INVOICE_FILE_MESSAGE);
    expect(invoiceFileIssue(file('factura.pdf', 'text/plain'))).toBe(
      INVOICE_FILE_MESSAGE,
    );
  });

  it('refuses a file over 5 MB', () => {
    expect(
      invoiceFileIssue(
        file('factura.pdf', 'application/pdf', MAX_UPLOAD_BYTES + 1),
      ),
    ).toBe(INVOICE_FILE_MESSAGE);
  });
});

describe('fileSizeText', () => {
  it('shows kilobytes under a megabyte and megabytes with one decimal', () => {
    expect(fileSizeText(284113)).toBe('277 KB');
    expect(fileSizeText(200)).toBe('1 KB');
    expect(fileSizeText(1.25 * 1024 * 1024)).toBe('1,3 MB');
    expect(fileSizeText(5 * 1024 * 1024)).toBe('5 MB');
  });
});
