'use client';

import { X } from 'lucide-react';
import { useState } from 'react';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { FormSection } from '@/components/form-section';
import { Button } from '@/components/ui/button';
import { useObjectUrl } from '@/hooks/use-object-url';

import {
  MAX_PHOTOS,
  type SelectedPhoto,
  selectPhotos,
} from '../photo-selection';
import { PhotoPicker } from './photo-picker';
import { PhotoThumb } from './photo-thumb';
import { PhotoViewerDialog } from './photo-viewer-dialog';

function ChosenPhoto({
  photo,
  index,
  disabled,
  onOpen,
  onRemove,
}: {
  photo: SelectedPhoto;
  index: number;
  disabled: boolean;
  onOpen: (url: string, label: string) => void;
  onRemove: () => void;
}) {
  const url = useObjectUrl(photo.blob);
  const label = `Foto ${index}`;
  return (
    <PhotoThumb
      action={
        <Button
          aria-label={`Quitar ${label}`}
          className="h-9 w-full"
          disabled={disabled}
          onClick={onRemove}
          type="button"
          variant="outline"
        >
          <X aria-hidden="true" className="size-4" /> Quitar
        </Button>
      }
      label={label}
      onOpen={url ? () => onOpen(url, label) : undefined}
      url={url}
    />
  );
}

// Las fotos de la planilla. Se eligen antes de guardar y se envían justo después del monitoreo,
// porque el servidor no acepta fotos de uno que todavía no está realizado. `already` son las de este
// monitoreo que ya esperan en el dispositivo (de una corrección): cuentan para el máximo.
export function MonitoringPhotosField({
  photos,
  already,
  disabled,
  onChange,
}: {
  photos: readonly SelectedPhoto[];
  already: number;
  disabled: boolean;
  onChange: (photos: SelectedPhoto[]) => void;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [viewing, setViewing] = useState<{ url: string; label: string }>();

  const add = async (files: File[]) => {
    const { photos: added, errors: rejected } = await selectPhotos(files, {
      already: already + photos.length,
    });
    setErrors(rejected);
    if (added.length > 0) onChange([...photos, ...added]);
  };

  return (
    <FormSection title={`Fotos (opcional · hasta ${MAX_PHOTOS})`}>
      <div className="space-y-3">
        {photos.length > 0 && (
          <ul aria-label="Fotos elegidas" className="flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <ChosenPhoto
                disabled={disabled}
                index={index + 1}
                key={photo.id}
                onOpen={(url, label) => setViewing({ url, label })}
                onRemove={() =>
                  onChange(photos.filter(({ id }) => id !== photo.id))
                }
                photo={photo}
              />
            ))}
          </ul>
        )}
        <PhotoPicker
          buttonClassName={CAPTURE_BUTTON_CLASS}
          disabled={disabled}
          onFiles={(files) => void add(files)}
        />
        {errors.map((message) => (
          <p className="text-sm font-bold text-err" key={message} role="alert">
            {message}
          </p>
        ))}
      </div>
      {viewing && (
        <PhotoViewerDialog
          label={viewing.label}
          onClose={() => setViewing(undefined)}
          url={viewing.url}
        />
      )}
    </FormSection>
  );
}
