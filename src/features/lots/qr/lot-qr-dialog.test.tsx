import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveFile } from '@/lib/files/save-file';
import { notify } from '@/lib/notify';
import { apiError, buildLot, buildLotQr } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { LotQrDialog } from './lot-qr-dialog';

vi.mock('@/lib/files/save-file', () => ({ saveFile: vi.fn() }));
// jsdom no tiene lienzo: el PNG se simula; el dibujo en SVG sí corre de verdad.
vi.mock('./qr-files', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./qr-files')>()),
  qrPngBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
}));

const QR = buildLotQr();
const CLASSIFIED = buildLot({ status: 'classified' });
const QR_URL = apiUrl('/api/lots/l1/qr');

let posts: number;

function serveGenerate(response: () => Response) {
  server.use(
    http.post(QR_URL, () => {
      posts += 1;
      return response();
    }),
    http.get(apiUrl('/api/auth/csrf'), () =>
      HttpResponse.json({ csrf_token: 'token' }),
    ),
  );
}

const renderDialog = (lot = CLASSIFIED, onClose = vi.fn()) => {
  renderWithProviders(<LotQrDialog lot={lot} onClose={onClose} />);
  return onClose;
};

beforeEach(() => {
  posts = 0;
  vi.spyOn(notify, 'success').mockImplementation(() => undefined as never);
  vi.spyOn(notify, 'info').mockImplementation(() => undefined as never);
  vi.mocked(saveFile).mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LotQrDialog without a code', () => {
  it('says what becomes public before generating anything', () => {
    renderDialog();
    expect(
      screen.getByRole('heading', { name: 'Código QR del lote' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No verá precios, compradores ni datos personales/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Generar código QR' }),
    ).toBeEnabled();
    expect(posts).toBe(0);
  });

  it('generates the code, announces it and then shows it without a second generate button', async () => {
    serveGenerate(() => HttpResponse.json(QR, { status: 201 }));
    renderDialog();

    await userEvent.click(
      screen.getByRole('button', { name: 'Generar código QR' }),
    );

    expect(
      await screen.findByRole('img', {
        name: 'Código QR del lote 000123-F02-P05-261014-1',
      }),
    ).toBeInTheDocument();
    expect(posts).toBe(1);
    expect(notify.success).toHaveBeenCalledWith('Código QR generado');
    expect(
      screen.queryByRole('button', { name: 'Generar código QR' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Descargar PNG' }),
    ).toBeInTheDocument();
  });

  it('does not report a failure when someone generated the code first', async () => {
    serveGenerate(() =>
      apiError(
        409,
        'lot_qr_already_exists',
        'Este lote ya tiene un código QR.',
      ),
    );
    renderDialog();

    await userEvent.click(
      screen.getByRole('button', { name: 'Generar código QR' }),
    );

    await waitFor(() =>
      expect(notify.info).toHaveBeenCalledWith(
        'Este lote ya tiene un código QR.',
      ),
    );
    expect(screen.queryByText(/No fue posible|cambió de estado/)).toBeNull();
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('says the lot changed state when it is no longer classified', async () => {
    serveGenerate(() =>
      apiError(409, 'lot_not_classified', 'Solo un lote clasificado.'),
    );
    renderDialog();

    await userEvent.click(
      screen.getByRole('button', { name: 'Generar código QR' }),
    );

    expect(
      await screen.findByText(
        'El lote cambió de estado: ya no puede tener código QR.',
      ),
    ).toBeInTheDocument();
    expect(notify.success).not.toHaveBeenCalled();
  });

  it('cannot generate without a connection and says why', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderDialog();
    expect(
      screen.getByRole('button', { name: 'Generar código QR' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Necesitas conexión para generar el código QR.'),
    ).toBeInTheDocument();
  });
});

describe('LotQrDialog with a code', () => {
  const withQr = () => buildLot({ status: 'in_warehouse', qr: QR });

  it('shows the code, says it exists and offers the four actions but never to generate another', async () => {
    renderDialog(withQr());

    expect(
      await screen.findByRole('img', { name: /Código QR del lote/ }),
    ).toBeInTheDocument();
    const sentence = screen.getByText(/Este lote ya tiene un código QR/);
    expect(sentence).toHaveTextContent(/Generado el .+\.$/);
    expect(sentence).not.toHaveTextContent('..');
    expect(
      screen.getByRole('button', { name: 'Descargar PNG' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Descargar SVG' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copiar enlace' }),
    ).toBeInTheDocument();
    const open = screen.getByRole('link', { name: 'Abrir página pública' });
    expect(open).toHaveAttribute('href', QR.public_url);
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(
      screen.queryByRole('button', { name: 'Generar código QR' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ['Descargar PNG', 'qr-000123-F02-P05-261014-1.png', 'image/png'],
    ['Descargar SVG', 'qr-000123-F02-P05-261014-1.svg', 'image/svg+xml'],
  ])('%s saves a file named after the lot', async (button, name, type) => {
    renderDialog(withQr());
    await userEvent.click(screen.getByRole('button', { name: button }));

    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
    const [blob, fileName] = vi.mocked(saveFile).mock.calls[0];
    expect(fileName).toBe(name);
    expect(blob.type).toBe(type);
  });

  it('copies the public address', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      ...navigator,
      onLine: true,
      clipboard: { writeText },
    });
    renderDialog(withQr());

    await userEvent.click(
      screen.getByRole('button', { name: 'Copiar enlace' }),
    );

    expect(writeText).toHaveBeenCalledWith(QR.public_url);
    vi.unstubAllGlobals();
  });

  it('still downloads without a connection: the drawing happens in the browser', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderDialog(withQr());
    await userEvent.click(
      screen.getByRole('button', { name: 'Descargar PNG' }),
    );
    await waitFor(() => expect(saveFile).toHaveBeenCalledTimes(1));
  });

  it('closes with Cerrar', async () => {
    const onClose = renderDialog(withQr());
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
