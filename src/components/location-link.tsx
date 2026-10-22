import { ExternalLink, MapPin } from 'lucide-react';

import { googleMapsUrl, parseCoordinates } from '@/lib/format/coordinates';
import type { Coordinates } from '@/types/geo';

// Unas coordenadas como texto que se tocan para verlas en Google Maps, en otra pestaña o en la
// aplicación del celular. Si no son un punto posible se muestran sin enlace.
export function LocationLink({
  coordinates,
  withPin = true,
}: {
  coordinates: Coordinates;
  // Sin el alfiler cuando quien lo muestra ya tiene su propio ícono de ubicación.
  withPin?: boolean;
}) {
  const point = parseCoordinates(coordinates);
  const text = `${coordinates.latitude}, ${coordinates.longitude}`;
  const pin = withPin && (
    <MapPin aria-hidden="true" className="size-4 shrink-0 text-selva" />
  );
  if (!point) {
    return (
      <span className="inline-flex items-center gap-1">
        {pin}
        {text}
      </span>
    );
  }
  return (
    <a
      className="inline-flex min-h-8 flex-wrap items-center gap-x-1 underline decoration-selva/40 underline-offset-4 hover:decoration-selva"
      href={googleMapsUrl(point)}
      rel="noopener noreferrer"
      target="_blank"
      title="Abrir en Google Maps"
    >
      {pin}
      {text}
      <ExternalLink
        aria-hidden="true"
        className="size-3.5 text-muted-foreground"
      />
      <span className="sr-only"> Abrir en Google Maps, en otra pestaña</span>
    </a>
  );
}
