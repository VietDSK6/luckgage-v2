import { describe, expect, it } from 'vitest';

import { TimelineStatus } from './trips.dto.js';
import { getTimelineStatus } from './trip-presentation.js';

describe('trip timeline presentation', () => {
  it('uses inclusive start and end dates', () => {
    expect(getTimelineStatus('2026-12-10', '2026-12-13', '2026-12-09')).toBe(
      TimelineStatus.UPCOMING,
    );
    expect(getTimelineStatus('2026-12-10', '2026-12-13', '2026-12-10')).toBe(
      TimelineStatus.ACTIVE,
    );
    expect(getTimelineStatus('2026-12-10', '2026-12-13', '2026-12-14')).toBe(
      TimelineStatus.PAST,
    );
  });
});
