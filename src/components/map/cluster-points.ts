// Un punto ya proyectado a la pantalla, en píxeles.
export type ScreenPoint<T> = { item: T; x: number; y: number };
export type ScreenCluster<T> = { items: T[]; x: number; y: number };

// Una sola pasada: cada punto entra al primer grupo cuyo centro está a `radius` píxeles o
// menos, o abre uno nuevo; el centro es el promedio de sus puntos. El resultado depende del
// orden de entrada, y eso basta para que ningún marcador tape a otro.
export function clusterScreenPoints<T>(
  points: readonly ScreenPoint<T>[],
  radius: number,
): ScreenCluster<T>[] {
  const clusters: ScreenCluster<T>[] = [];
  for (const point of points) {
    const near = clusters.find(
      (cluster) =>
        Math.hypot(cluster.x - point.x, cluster.y - point.y) <= radius,
    );
    if (!near) {
      clusters.push({ items: [point.item], x: point.x, y: point.y });
      continue;
    }
    const size = near.items.length;
    near.x = (near.x * size + point.x) / (size + 1);
    near.y = (near.y * size + point.y) / (size + 1);
    near.items.push(point.item);
  }
  return clusters;
}
