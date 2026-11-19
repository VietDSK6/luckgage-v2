import type { VisitedProvince } from './journeys';

export type StampRegion = 'north' | 'central' | 'south';

export type StampEntry = {
  id: string;
  region: StampRegion;
  nameVi: string;
  /** Start date of the first trip to this province, or null while the stamp is locked. */
  unlockedOn: string | null;
};

const REGION_ORDER: Record<StampRegion, number> = { north: 0, central: 1, south: 2 };

/** Every stamp in album order (north to south, then by name), with unlock dates from visited provinces. */
export function buildStampAlbum(
  catalog: readonly { id: string; region: StampRegion; nameVi: string }[],
  visited: readonly VisitedProvince[],
): StampEntry[] {
  const firstVisit = new Map(
    visited.map((province) => [province.id, province.trips.map((trip) => trip.startDate).sort()[0] ?? null]),
  );
  return [...catalog]
    .sort((first, second) => REGION_ORDER[first.region] - REGION_ORDER[second.region] || first.nameVi.localeCompare(second.nameVi, 'vi'))
    .map((stamp) => ({ ...stamp, unlockedOn: firstVisit.get(stamp.id) ?? null }));
}

/** Unlocked stamps the user has not been shown yet, newest unlock first. */
export function findNewStamps(album: readonly StampEntry[], seenIds: ReadonlySet<string>): StampEntry[] {
  return album
    .filter((stamp) => stamp.unlockedOn !== null && !seenIds.has(stamp.id))
    .sort((first, second) => (second.unlockedOn ?? '').localeCompare(first.unlockedOn ?? ''));
}
