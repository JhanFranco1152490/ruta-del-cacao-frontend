'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const JPEG_QUALITY = 0.92;

// Lo que ve la cámara en este instante, como un archivo JPG con la hora en que se tomó.
function frameAsFile(video: HTMLVideoElement): Promise<File | null> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) =>
    canvas.toBlob(
      (blob) => {
        const now = Date.now();
        resolve(
          blob
            ? new File([blob], `foto-${now}.jpg`, {
                type: 'image/jpeg',
                lastModified: now,
              })
            : null,
        );
      },
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );
}

// La cámara de un computador: en el celular `capture` abre la aplicación de la cámara, pero en un
// computador el navegador solo ofrece el selector de archivos, así que aquí se muestra la imagen en
// vivo y se captura un cuadro. La cámara se apaga al cerrar, con foto o sin ella.
export function WebcamDialog({
  onCapture,
  onClose,
  onChooseFile,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onChooseFile: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'starting' | 'ready' | 'failed'>(
    'starting',
  );

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((opened) => {
        if (cancelled) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        if (video.current) video.current.srcObject = opened;
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = async () => {
    if (!video.current) return;
    const file = await frameAsFile(video.current);
    if (file) onCapture(file);
  };

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tomar foto</DialogTitle>
          <DialogDescription>
            {status === 'failed'
              ? 'No se pudo abrir la cámara de este equipo. Revisa que esté conectada y que el navegador tenga permiso para usarla, o elige un archivo.'
              : 'Apunta la cámara a lo que quieres mostrar y toca Capturar.'}
          </DialogDescription>
        </DialogHeader>
        {status !== 'failed' && (
          <video
            aria-label="Imagen de la cámara"
            autoPlay
            className="max-h-[60vh] w-full rounded-md bg-black object-contain"
            muted
            playsInline
            ref={video}
          />
        )}
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          {status === 'failed' ? (
            <Button onClick={onChooseFile} type="button">
              Elegir un archivo
            </Button>
          ) : (
            <Button
              disabled={status !== 'ready'}
              onClick={() => void capture()}
              type="button"
            >
              Capturar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
