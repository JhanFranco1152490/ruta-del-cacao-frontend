import { cn } from 'cn';

export type ScatterPoint = {
  key: string;
  label: string;
  x: number;
  y: number;
  // El tamaño del punto: lo mayor se dibuja con el radio más grande.
  size: number;
  color: string;
};

const WIDTH = 640;
const HEIGHT = 300;
const PAD = { left: 44, right: 16, top: 16, bottom: 34 };
const MIN_RADIUS = 6;
const MAX_RADIUS = 22;

// Puntos en un plano: x e y a una escala cada uno (y de 0 a 100 %) y el tamaño por la tercera
// medida. Lleva las líneas del promedio de x y de y para repartir el plano en cuatro zonas, y cada
// punto nombrado al lado. Lo dibujado es decorativo: los mismos datos van en una tabla para el lector
// de pantalla.
export function ScatterChart({
  label,
  points,
  xLabel,
  yLabel,
  averageX,
  averageY,
  formatX,
  formatY,
  className,
}: {
  label: string;
  points: readonly ScatterPoint[];
  xLabel: string;
  yLabel: string;
  averageX: number;
  averageY: number;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  className?: string;
}) {
  const maxX = Math.max(1, averageX, ...points.map(({ x }) => x)) * 1.1;
  const maxSize = Math.max(1, ...points.map(({ size }) => size));
  const px = (x: number) =>
    PAD.left + (x / maxX) * (WIDTH - PAD.left - PAD.right);
  const py = (y: number) =>
    PAD.top + (1 - y / 100) * (HEIGHT - PAD.top - PAD.bottom);
  const radius = (size: number) =>
    MIN_RADIUS + Math.sqrt(size / maxSize) * (MAX_RADIUS - MIN_RADIUS);
  return (
    <figure className={cn('space-y-2', className)}>
      <svg
        aria-hidden="true"
        className="block h-auto w-full"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <g stroke="var(--border)" strokeWidth="1">
          <line
            x1={PAD.left}
            x2={PAD.left}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
          />
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={HEIGHT - PAD.bottom}
            y2={HEIGHT - PAD.bottom}
          />
          <line
            strokeDasharray="4 4"
            x1={px(averageX)}
            x2={px(averageX)}
            y1={PAD.top}
            y2={HEIGHT - PAD.bottom}
          />
          <line
            strokeDasharray="4 4"
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={py(averageY)}
            y2={py(averageY)}
          />
        </g>
        <g fill="var(--muted-foreground)" fontSize="11">
          <text x={PAD.left} y={HEIGHT - 12}>
            {formatX(0)}
          </text>
          <text textAnchor="end" x={WIDTH - PAD.right} y={HEIGHT - 12}>
            {formatX(maxX)}
          </text>
          <text textAnchor="middle" x={(WIDTH + PAD.left) / 2} y={HEIGHT - 12}>
            {xLabel}
          </text>
          <text textAnchor="end" x={PAD.left - 6} y={PAD.top + 8}>
            100 %
          </text>
          <text textAnchor="end" x={PAD.left - 6} y={HEIGHT - PAD.bottom}>
            0 %
          </text>
          <text x={PAD.left + 6} y={PAD.top + 10}>
            {yLabel}
          </text>
        </g>
        {points.map((point) => (
          <g key={point.key}>
            <circle
              cx={px(point.x)}
              cy={py(point.y)}
              fill={point.color}
              fillOpacity="0.85"
              r={radius(point.size)}
            />
            <text
              fill="var(--foreground)"
              fontSize="12"
              fontWeight="700"
              textAnchor={px(point.x) > WIDTH * 0.7 ? 'end' : 'start'}
              x={
                px(point.x) > WIDTH * 0.7
                  ? px(point.x) - radius(point.size) - 4
                  : px(point.x) + radius(point.size) + 4
              }
              y={py(point.y) + 4}
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Punto</th>
            <th scope="col">{xLabel}</th>
            <th scope="col">{yLabel}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.key}>
              <th scope="row">{point.label}</th>
              <td>{formatX(point.x)}</td>
              <td>{formatY(point.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
