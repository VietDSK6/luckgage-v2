import {
  VIETNAM_PROJECTION,
  VIETNAM_PROVINCES,
  type MapPoint,
  type ProvinceShape,
} from '../vietnamMap';

export type JourneyTrip = {
  id: string;
  name: string;
  destinationLabel: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  dayCount: number;
  packedItemCount: number;
};

export type VisitedProvince = { id: string; name: string; trips: JourneyTrip[] };

// A destination up to ~10 km off the simplified coastline (bays, small islands) still belongs
// to the nearest province. Map units are roughly 1.6 km each.
const COASTAL_SNAP_DISTANCE = 6;

export function projectToMap(latitude: number, longitude: number): MapPoint {
  return [
    (longitude - VIETNAM_PROJECTION.lonMin) * VIETNAM_PROJECTION.xScale,
    (VIETNAM_PROJECTION.latMax - latitude) * VIETNAM_PROJECTION.yScale,
  ];
}

function insideRings(point: MapPoint, province: ProvinceShape): boolean {
  const [x, y] = point;
  let inside = false;
  for (const ring of province.rings) {
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
      const [xi, yi] = ring[index];
      const [xj, yj] = ring[previous];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function distanceToProvince(point: MapPoint, province: ProvinceShape): number {
  let best = Number.POSITIVE_INFINITY;
  for (const ring of province.rings) {
    for (let index = 0; index < ring.length - 1; index += 1) {
      const [ax, ay] = ring[index];
      const [bx, by] = ring[index + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const length = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((point[0] - ax) * dx + (point[1] - ay) * dy) / length));
      best = Math.min(best, Math.hypot(point[0] - (ax + t * dx), point[1] - (ay + t * dy)));
    }
  }
  return best;
}

export function findProvinceId(
  latitude: number,
  longitude: number,
  provinces: readonly ProvinceShape[] = VIETNAM_PROVINCES,
): string | null {
  const point = projectToMap(latitude, longitude);
  const containing = provinces.find((province) => insideRings(point, province));
  if (containing) return containing.id;

  let nearest: { id: string; distance: number } | null = null;
  for (const province of provinces) {
    const distance = distanceToProvince(point, province);
    if (distance <= COASTAL_SNAP_DISTANCE && (!nearest || distance < nearest.distance)) {
      nearest = { id: province.id, distance };
    }
  }
  return nearest?.id ?? null;
}

/** Groups trips by the province containing their destination; trips without a match are returned apart. */
export function groupTripsByProvince(trips: readonly JourneyTrip[]): {
  provinces: VisitedProvince[];
  unmapped: JourneyTrip[];
} {
  const byId = new Map<string, VisitedProvince>();
  const unmapped: JourneyTrip[] = [];
  for (const trip of trips) {
    const id = trip.latitude === null || trip.longitude === null ? null : findProvinceId(trip.latitude, trip.longitude);
    const province = id ? VIETNAM_PROVINCES.find((candidate) => candidate.id === id) : undefined;
    if (!province) {
      unmapped.push(trip);
      continue;
    }
    const entry = byId.get(province.id) ?? { id: province.id, name: province.name, trips: [] };
    entry.trips.push(trip);
    byId.set(province.id, entry);
  }
  return {
    provinces: [...byId.values()].sort((first, second) => second.trips.length - first.trips.length || first.name.localeCompare(second.name, 'vi')),
    unmapped,
  };
}

export function ringsToSvgPath(province: ProvinceShape): string {
  return province.rings
    .map((ring) => `M${ring.map(([x, y]) => `${x},${y}`).join('L')}Z`)
    .join('');
}
