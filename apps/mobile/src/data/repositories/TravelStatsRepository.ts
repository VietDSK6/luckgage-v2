import type { ApiClient } from '@/data/remote/ApiClient';
import type { JourneyTrip } from '@/features/journeys/domain/journeys';

export type TravelStats = {
  tripCount: number;
  dayCount: number;
  packedItemCount: number;
  trips: JourneyTrip[];
};

export class TravelStatsRepository {
  constructor(private readonly api: ApiClient) {}

  async get(today: string): Promise<TravelStats> {
    const stats = await this.api.request<TravelStats>(`/me/travel-stats?today=${encodeURIComponent(today)}`);
    if (!stats || !Array.isArray(stats.trips) || !Number.isInteger(stats.tripCount)) {
      throw new Error('Invalid travel stats response');
    }
    return stats;
  }
}
