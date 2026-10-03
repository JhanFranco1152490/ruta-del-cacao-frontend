import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Contorno de los municipios de Norte de Santander a partir del Marco Geoestadístico Nacional
// del DANE (licencia CC BY 4.0: quien dibuje estos contornos muestra "Límites: DANE – MGN
// 2025"). Se corre a mano solo cuando el DANE publique un marco nuevo; el resultado se
// versiona en el repo.
const LAYER_URL =
  'https://geoportal.dane.gov.co/mparcgis/rest/services/MGN2025/Serv_CapasMGN_2025/FeatureServer/317/query';
const DEPARTMENT_CODE = '54';
const EXPECTED_MUNICIPALITIES = 40;
// Versión fija: otra versión podría simplificar distinto y cambiar el archivo sin motivo.
const MAPSHAPER = 'mapshaper@0.6.121';

const output = path.join(
  import.meta.dirname,
  '..',
  'src',
  'lib',
  'geo',
  'norte-de-santander-municipalities.json',
);

const query = new URLSearchParams({
  where: `DPTO_CCDGO = '${DEPARTMENT_CODE}'`,
  outFields: 'MPIO_CDPMP',
  outSR: '4326',
  f: 'geojson',
});
const response = await fetch(`${LAYER_URL}?${query}`);
if (!response.ok) throw new Error(`El DANE respondió ${response.status}`);
const raw = await response.text();

const workDir = await mkdtemp(path.join(os.tmpdir(), 'municipalities-'));
try {
  const input = path.join(workDir, 'raw.geojson');
  const simplified = path.join(workDir, 'simplified.geojson');
  await writeFile(input, raw);
  // La simplificación se hace sobre la capa completa, no municipio por municipio: así los
  // bordes compartidos se simplifican una sola vez y no quedan huecos entre vecinos.
  execFileSync(
    'npx',
    [
      '-y',
      MAPSHAPER,
      input,
      '-rename-fields',
      'code=MPIO_CDPMP',
      '-simplify',
      'interval=100',
      'keep-shapes',
      '-o',
      'precision=0.00001',
      'format=geojson',
      simplified,
    ],
    { stdio: 'inherit' },
  );

  const collection = JSON.parse(await readFile(simplified, 'utf8'));
  const features = collection.features
    .map((feature) => ({
      type: 'Feature',
      bbox: bboxOf(feature.geometry),
      properties: { code: feature.properties.code },
      geometry: feature.geometry,
    }))
    .sort((a, b) => a.properties.code.localeCompare(b.properties.code));

  const codes = new Set(features.map((feature) => feature.properties.code));
  const valid =
    features.length === EXPECTED_MUNICIPALITIES &&
    codes.size === EXPECTED_MUNICIPALITIES &&
    [...codes].every((code) =>
      new RegExp(`^${DEPARTMENT_CODE}\\d{3}$`).test(code),
    );
  if (!valid) {
    throw new Error(
      `Se esperaban ${EXPECTED_MUNICIPALITIES} municipios ${DEPARTMENT_CODE}xxx y llegaron: ${[...codes].join(', ')}`,
    );
  }

  await writeFile(
    output,
    JSON.stringify({ type: 'FeatureCollection', features }),
  );
  const [west, south, east, north] = bboxOf({
    type: 'MultiPolygon',
    coordinates: features.flatMap((feature) => polygonsOf(feature.geometry)),
  });
  console.log(`Escrito ${path.relative(process.cwd(), output)}`);
  console.log(
    `Rectángulo del departamento: sur ${south}, oeste ${west}, norte ${north}, este ${east}`,
  );
} finally {
  await rm(workDir, { recursive: true, force: true });
}

function polygonsOf(geometry) {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.coordinates;
}

// [oeste, sur, este, norte], el orden que define GeoJSON para `bbox`.
function bboxOf(geometry) {
  const positions = polygonsOf(geometry).flat(2);
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);
  return [
    Math.min(...longitudes),
    Math.min(...latitudes),
    Math.max(...longitudes),
    Math.max(...latitudes),
  ];
}
