import L from 'leaflet';

import { clusterScreenPoints } from './cluster-points';
import { pinIcon, popupContent, toLatLng } from './leaflet-shared';
import type { MapPoint } from './map-provider';

const CLUSTER_RADIUS_PX = 40;

const clusterIcon = (count: number) =>
  L.divIcon({
    className: '',
    html: `<span class="map-cluster">${count}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const describePoint = (point: MapPoint) =>
  point.detail ? `${point.label} · ${point.detail}` : point.label;

function clusterContent(points: readonly MapPoint[]) {
  const content = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = `${points.length} fincas aquí`;
  const list = document.createElement('ul');
  list.className = 'map-cluster-list';
  for (const point of points) {
    const item = document.createElement('li');
    item.textContent = describePoint(point);
    list.append(item);
  }
  content.append(title, list);
  return content;
}

// Puntos agrupados según lo que se tapa en pantalla a este zoom. Un grupo acerca el mapa hasta
// separarse; si ya no puede (fincas casi en el mismo punto, o zoom máximo), lista sus fincas.
export function pointsLayer(
  map: L.Map,
  points: readonly MapPoint[],
  onSelect: (id: string) => void,
) {
  const group = L.layerGroup();
  const projected = points.map((point) => {
    const { x, y } = map.latLngToLayerPoint(toLatLng(point.position));
    return { item: point, x, y };
  });
  for (const cluster of clusterScreenPoints(projected, CLUSTER_RADIUS_PX)) {
    if (cluster.items.length === 1) {
      const [point] = cluster.items;
      L.marker(toLatLng(point.position), {
        icon: pinIcon(point.tone),
        title: describePoint(point),
        alt: point.label,
        keyboard: true,
      })
        .bindPopup(popupContent(point.label, point.detail))
        .on('click', () => onSelect(point.id))
        .addTo(group);
      continue;
    }
    const marker = L.marker(map.layerPointToLatLng([cluster.x, cluster.y]), {
      icon: clusterIcon(cluster.items.length),
      title: `${cluster.items.length} fincas`,
      keyboard: true,
    }).addTo(group);
    marker.on('click', () => {
      const bounds = L.latLngBounds(
        cluster.items.map((point) => toLatLng(point.position)),
      ).pad(0.3);
      if (
        map.getZoom() < map.getMaxZoom() &&
        map.getBoundsZoom(bounds) > map.getZoom()
      ) {
        map.fitBounds(bounds);
      } else {
        marker.bindPopup(clusterContent(cluster.items)).openPopup();
      }
    });
  }
  return group;
}
