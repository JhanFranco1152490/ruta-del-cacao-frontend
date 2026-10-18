'use client';

import { Camera, ImageUp } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

import { WebcamDialog } from './webcam-dialog';

const ACCEPT = 'image/jpeg,image/png';

// En un celular o una tableta, `capture` abre la cámara. En un computador solo abre el selector de
// archivos, así que allí se usa la cámara del equipo, si el navegador deja (solo en https o en
// localhost); si no, queda el selector.
const canUseWebcam = () =>
  typeof window.matchMedia === 'function' &&
  !window.matchMedia('(pointer: coarse)').matches &&
  typeof navigator.mediaDevices?.getUserMedia === 'function';

// Tomar una foto con la cámara del teléfono o elegir una o varias de la galería. Entrega los
// archivos tal como llegan: quien lo usa los prepara.
export function PhotoPicker({
  disabled,
  onFiles,
  buttonClassName,
}: {
  disabled: boolean;
  onFiles: (files: File[]) => void;
  buttonClassName?: string;
}) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const take = (input: HTMLInputElement) => {
    const files = [...(input.files ?? [])];
    // Se vacía para poder elegir otra vez la misma foto después de quitarla.
    input.value = '';
    if (files.length > 0) onFiles(files);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        className={buttonClassName}
        disabled={disabled}
        onClick={() =>
          canUseWebcam() ? setWebcamOpen(true) : camera.current?.click()
        }
        type="button"
        variant="outline"
      >
        <Camera aria-hidden="true" className="size-5" /> Tomar foto
      </Button>
      <Button
        className={buttonClassName}
        disabled={disabled}
        onClick={() => gallery.current?.click()}
        type="button"
        variant="outline"
      >
        <ImageUp aria-hidden="true" className="size-5" /> Elegir de la galería
      </Button>
      <input
        accept={ACCEPT}
        aria-label="Foto de la cámara"
        capture="environment"
        className="sr-only"
        onChange={(event) => take(event.currentTarget)}
        ref={camera}
        tabIndex={-1}
        type="file"
      />
      <input
        accept={ACCEPT}
        aria-label="Fotos de la galería"
        className="sr-only"
        multiple
        onChange={(event) => take(event.currentTarget)}
        ref={gallery}
        tabIndex={-1}
        type="file"
      />
      {webcamOpen && (
        <WebcamDialog
          onCapture={(file) => {
            setWebcamOpen(false);
            onFiles([file]);
          }}
          onChooseFile={() => {
            setWebcamOpen(false);
            gallery.current?.click();
          }}
          onClose={() => setWebcamOpen(false)}
        />
      )}
    </div>
  );
}
