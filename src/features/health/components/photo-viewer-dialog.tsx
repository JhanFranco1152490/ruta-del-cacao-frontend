'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// La foto completa, al tocar su miniatura.
export function PhotoViewerDialog({
  url,
  label,
  onClose,
}: {
  url: string;
  label: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        {/* Una foto en memoria: el optimizador de imágenes no la puede servir. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={label}
          className="max-h-[75vh] w-full rounded-md object-contain"
          src={url}
        />
      </DialogContent>
    </Dialog>
  );
}
