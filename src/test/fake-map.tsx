import type {
  LoadMapProvider,
  LoadMunicipalityMapProvider,
  LoadPointsMapProvider,
  MapProviderProps,
  MunicipalityMapProviderProps,
  PointsMapProviderProps,
} from '@/components/map/map-provider';

// Doble del proveedor: expone el marcador como texto y botones para simular un toque en el
// mapa o una falla del mapa base.
export function FakeMap({
  point,
  onPointChange,
  disabled,
  baseLayer,
  focusBounds,
  onError,
}: MapProviderProps) {
  return (
    <div>
      <p>Capa: {baseLayer}</p>
      {focusBounds && (
        <p>
          Encuadre: {focusBounds.south}, {focusBounds.west} a{' '}
          {focusBounds.north}, {focusBounds.east}
        </p>
      )}
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
export function FakePointsMap({
  points,
  shapes = [],
  focus,
}: PointsMapProviderProps) {
  return (
    <>
      {focus && <p>Enfocado: {focus.shapeId}</p>}
      <ul aria-label="Marcadores del mapa">
        {points.map((point) => (
          <li key={point.id}>
            {point.label} ({point.tone}) {point.position.latitude},{' '}
            {point.position.longitude}
          </li>
        ))}
      </ul>
      {shapes.length > 0 && (
        <ul aria-label="Polígonos del mapa">
          {shapes.map((shape) => (
            <li key={shape.id}>
              {shape.label} ({shape.tone}) {shape.positions.length} vértices
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export const loadFakePointsMap: LoadPointsMapProvider = () =>
  Promise.resolve(FakePointsMap);

// Doble del mapa por municipios: cada municipio y cada punto como un botón.
export function FakeMunicipalityMap({
  view,
  baseLayer,
  onSelectMunicipality,
  onSelectPoint,
  onBaseLayerUnavailable,
  onBaseLayerFallback,
  onError,
}: MunicipalityMapProviderProps) {
  return (
    <div>
      <p>Capa: {baseLayer}</p>
      {view.level === 'department' ? (
        <ul aria-label="Municipios del mapa">
          {view.counts.map(({ code, count }) => (
            <li key={code}>
              <button onClick={() => onSelectMunicipality(code)} type="button">
                {code}: {count}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p>
            {view.level === 'free'
              ? 'Mapa libre'
              : `Municipio del mapa: ${view.code}`}
          </p>
          {view.focus && <p>Enfocada: {view.focus.pointId}</p>}
          <ul aria-label="Marcadores del mapa">
            {view.points.map((point) => (
              <li key={point.id}>
                <button onClick={() => onSelectPoint(point.id)} type="button">
                  {point.label} ({point.tone}) {point.detail}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button onClick={onBaseLayerUnavailable} type="button">
        Fallar mapa base
      </button>
      <button onClick={onBaseLayerFallback} type="button">
        Usar mapa de respaldo
      </button>
      <button onClick={onError} type="button">
        Fallar mapa
      </button>
    </div>
  );
}

export const loadFakeMunicipalityMap: LoadMunicipalityMapProvider = () =>
  Promise.resolve(FakeMunicipalityMap);
