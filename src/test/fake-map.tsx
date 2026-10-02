import type {
  LoadMapProvider,
  LoadPointsMapProvider,
  MapProviderProps,
  PointsMapProviderProps,
} from '@/components/map/map-provider';

// Doble del proveedor: expone el marcador como texto y botones para simular un toque en el
// mapa o una falla del mapa base.
export function FakeMap({
  point,
  onPointChange,
  disabled,
  baseLayer,
  onError,
}: MapProviderProps) {
  return (
    <div>
      <p>Capa: {baseLayer}</p>
      <p>
        Marcador:{' '}
        {point ? `${point.latitude}, ${point.longitude}` : 'sin marcador'}
      </p>
      <button
        disabled={disabled}
        onClick={() =>
          onPointChange({ latitude: 7.123456789, longitude: -72.5 })
        }
        type="button"
      >
        Tocar el mapa
      </button>
      <button onClick={onError} type="button">
        Fallar mapa base
      </button>
    </div>
  );
}

export const loadFakeMap: LoadMapProvider = () => Promise.resolve(FakeMap);

// Doble del mapa de varios puntos: lista cada marcador como texto.
export function FakePointsMap({ points }: PointsMapProviderProps) {
  return (
    <ul aria-label="Marcadores del mapa">
      {points.map((point) => (
        <li key={point.id}>
          {point.label} ({point.tone}) {point.position.latitude},{' '}
          {point.position.longitude}
        </li>
      ))}
    </ul>
  );
}

export const loadFakePointsMap: LoadPointsMapProvider = () =>
  Promise.resolve(FakePointsMap);
