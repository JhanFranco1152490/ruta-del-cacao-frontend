// Las piezas con que se dibujan la mata de cacao y las ilustraciones de cada módulo, para que todas
// tengan el mismo trazo: hojas en `--hoja`/`--selva-2` con su nervio claro, mazorcas con sus surcos
// y tallos en `--mazorca-negra`, y una sombra suave en el piso.
export const LEAF = 'M0 0 C9 -9 27 -11 42 0 C27 11 9 9 0 0Z';

export function Leaf({
  x,
  y,
  angle,
  scale = 1,
  tone = 'var(--hoja)',
}: {
  x: number;
  y: number;
  angle: number;
  scale?: number;
  tone?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path d={LEAF} fill={tone} />
      <path
        d="M2 0 H38"
        stroke="var(--crema)"
        strokeOpacity=".45"
        strokeWidth="1"
      />
    </g>
  );
}

export function Pod({
  x,
  y,
  angle,
  scale,
  fill,
}: {
  x: number;
  y: number;
  angle: number;
  scale: number;
  fill: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
      <path
        d="M0 -15 C7 -15 11 -5 11 4 C11 13 6 19 0 19 C-6 19 -11 13 -11 4 C-11 -5 -7 -15 0 -15Z"
        fill={fill}
      />
      <path
        d="M0 -14 V18 M-5 -11 C-8 -1 -8 10 -4 17 M5 -11 C8 -1 8 10 4 17"
        fill="none"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".35"
        strokeWidth="1.2"
      />
      <path
        d="M0 -15 V-19"
        stroke="var(--mazorca-negra)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>
  );
}

// La sombra del piso, bajo cada ilustración.
export function Ground({ width = 44 }: { width?: number }) {
  return <ellipse cx="80" cy="131" rx={width} ry="5" fill="var(--border)" />;
}

// El marco común: mismo tamaño y proporción que la mata, siempre decorativo.
export function IllustrationFrame({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg className={className} viewBox="0 0 160 140" aria-hidden="true">
      {children}
    </svg>
  );
}
