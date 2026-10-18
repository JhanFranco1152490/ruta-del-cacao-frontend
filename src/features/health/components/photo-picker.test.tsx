import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PhotoPicker } from './photo-picker';

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] } as unknown as MediaStream;

function setDevice({
  coarse,
  getUserMedia,
}: {
  coarse: boolean;
  getUserMedia?: () => Promise<MediaStream>;
}) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: coarse && query === '(pointer: coarse)',
    })),
  );
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: getUserMedia ? { getUserMedia } : undefined,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  track.stop.mockClear();
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: undefined,
  });
});

const renderPicker = (onFiles = vi.fn()) => {
  render(<PhotoPicker disabled={false} onFiles={onFiles} />);
  return onFiles;
};

describe('PhotoPicker', () => {
  it('opens the camera of the computer instead of a file chooser', async () => {
    const getUserMedia = vi.fn(async () => stream);
    setDevice({ coarse: false, getUserMedia });
    const chooser = vi.spyOn(HTMLInputElement.prototype, 'click');
    renderPicker();

    await userEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));

    expect(
      await screen.findByRole('button', { name: 'Capturar' }),
    ).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(chooser).not.toHaveBeenCalled();
  });

  it('keeps the camera of the phone where the screen is touched', async () => {
    const getUserMedia = vi.fn(async () => stream);
    setDevice({ coarse: true, getUserMedia });
    const chooser = vi.spyOn(HTMLInputElement.prototype, 'click');
    renderPicker();

    await userEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));

    expect(chooser).toHaveBeenCalledTimes(1);
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('falls back to the chooser when the browser has no camera access', async () => {
    setDevice({ coarse: false });
    const chooser = vi.spyOn(HTMLInputElement.prototype, 'click');
    renderPicker();

    await userEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));

    expect(chooser).toHaveBeenCalledTimes(1);
  });

  it('hands over the captured frame as a jpeg and releases the camera', async () => {
    setDevice({ coarse: false, getUserMedia: async () => stream });
    vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(
      640,
    );
    vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(
      480,
    );
    const draw = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: draw,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(new Blob(['jpg'], { type: 'image/jpeg' })),
    );
    const onFiles = renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));

    await userEvent.click(
      await screen.findByRole('button', { name: 'Capturar' }),
    );

    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1));
    const [[file]] = onFiles.mock.calls[0] as [File[]];
    expect(file.type).toBe('image/jpeg');
    expect(file.name).toMatch(/^foto-.*\.jpg$/);
    expect(draw).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: 'Capturar' }),
    ).not.toBeInTheDocument();
  });

  it('says so and offers the chooser when the camera is not available', async () => {
    setDevice({
      coarse: false,
      getUserMedia: async () => {
        throw new DOMException('negado', 'NotAllowedError');
      },
    });
    const chooser = vi.spyOn(HTMLInputElement.prototype, 'click');
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));

    expect(
      await screen.findByText(/No se pudo abrir la cámara/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Capturar' }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Elegir un archivo' }),
    );

    expect(chooser).toHaveBeenCalledTimes(1);
  });

  it('releases the camera when the dialog is closed without a photo', async () => {
    setDevice({ coarse: false, getUserMedia: async () => stream });
    renderPicker();
    await userEvent.click(screen.getByRole('button', { name: 'Tomar foto' }));
    await screen.findByRole('button', { name: 'Capturar' });

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(track.stop).toHaveBeenCalled();
  });
});
