import Storage from 'expo-sqlite/kv-store';

// Which unlocked stamps this device has already celebrated. Purely cosmetic: losing it only
// replays the "new stamp" moment.
const SEEN_STAMPS_KEY = 'stamps.seen.v1';

export async function loadSeenStamps(): Promise<Set<string>> {
  try {
    const value = await Storage.getItem(SEEN_STAMPS_KEY);
    const ids: unknown = value ? JSON.parse(value) : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export async function saveSeenStamps(ids: Iterable<string>): Promise<void> {
  await Storage.setItem(SEEN_STAMPS_KEY, JSON.stringify([...new Set(ids)])).catch(() => undefined);
}
