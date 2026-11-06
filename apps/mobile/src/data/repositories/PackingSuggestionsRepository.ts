import { ApiClient, ApiClientError } from '@/data/remote/ApiClient';
import type {
  ApiLocale,
  ApiPackingApplyResponse,
  ApiPackingPreview,
} from '@/data/remote/apiTypes';
import type {
  PackingActivity,
  PackingPreview,
  PackingSuggestionItem,
} from '@/features/packing-suggestions/domain/packingSuggestions';

export type PackingSuggestionsRepositoryErrorCode =
  | 'VALIDATION'
  | 'NETWORK'
  | 'NOT_FOUND'
  | 'REMOTE';

export class PackingSuggestionsRepositoryError extends Error {
  constructor(
    readonly code: PackingSuggestionsRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'PackingSuggestionsRepositoryError';
  }
}

export interface PackingSuggestionsRepository {
  preview(input: {
    tripId: string;
    activities: PackingActivity[];
    notes: string;
    locale: ApiLocale;
  }): Promise<PackingPreview>;
  apply(tripId: string, items: PackingSuggestionItem[]): Promise<number>;
}

export class RemotePackingSuggestionsRepository implements PackingSuggestionsRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async preview(input: {
    tripId: string;
    activities: PackingActivity[];
    notes: string;
    locale: ApiLocale;
  }): Promise<PackingPreview> {
    try {
      const payload = await this.apiClient.request<ApiPackingPreview>(
        `/trips/${input.tripId}/packing-suggestions/preview`,
        {
          method: 'POST',
          body: {
            activities: input.activities,
            notes: input.notes.trim(),
            locale: input.locale,
          },
        },
      );
      return mapPackingPreview(payload);
    } catch (error) {
      throw mapPackingError('Could not generate packing suggestions', error);
    }
  }

  async apply(tripId: string, items: PackingSuggestionItem[]): Promise<number> {
    const selected = items.filter(
      (item) =>
        item.selected &&
        item.name.trim() &&
        item.categoryName.trim() &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0,
    );
    if (selected.length === 0) {
      throw new PackingSuggestionsRepositoryError('VALIDATION', 'Select at least one item');
    }

    const grouped = new Map<
      string,
      { name: string; quantity: number; note: string | null }[]
    >();
    for (const item of selected) {
      const categoryName = item.categoryName.trim();
      grouped.set(categoryName, [
        ...(grouped.get(categoryName) ?? []),
        {
          name: item.name.trim(),
          quantity: item.quantity,
          note: item.note?.trim() || null,
        },
      ]);
    }

    try {
      const payload = await this.apiClient.request<ApiPackingApplyResponse>(
        `/trips/${tripId}/packing-suggestions/apply`,
        {
          method: 'POST',
          body: {
            categories: [...grouped].map(([name, categoryItems]) => ({
              name,
              items: categoryItems,
            })),
          },
        },
      );
      if (!Number.isInteger(payload?.addedItemCount) || payload.addedItemCount < 0) {
        throw new PackingSuggestionsRepositoryError(
          'REMOTE',
          'Packing apply response contains invalid data',
        );
      }
      return payload.addedItemCount;
    } catch (error) {
      throw mapPackingError('Could not apply packing suggestions', error);
    }
  }
}

export function mapPackingPreview(payload: ApiPackingPreview): PackingPreview {
  if (
    payload?.source !== 'RULE_BASED' ||
    !payload.sourceLabel ||
    !Array.isArray(payload.categories)
  ) {
    throw new PackingSuggestionsRepositoryError(
      'REMOTE',
      'Packing preview response contains invalid data',
    );
  }

  const items = payload.categories.flatMap((category) => {
    if (!category?.clientKey || !category.name || !Array.isArray(category.items)) {
      throw new PackingSuggestionsRepositoryError(
        'REMOTE',
        'Packing category response contains invalid data',
      );
    }
    return category.items.map((item): PackingSuggestionItem => {
      if (
        !item?.clientKey ||
        !item.name ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !item.reason
      ) {
        throw new PackingSuggestionsRepositoryError(
          'REMOTE',
          'Packing item response contains invalid data',
        );
      }
      return {
        id: `${category.clientKey}:${item.clientKey}`,
        categoryId: category.clientKey,
        categoryName: category.name,
        name: item.name,
        quantity: item.quantity,
        note: item.note ?? null,
        reason: item.reason,
        selected: true,
      };
    });
  });

  return {
    items,
    sourceLabel: payload.sourceLabel,
    weatherUsed: payload.weatherStatus !== 'UNAVAILABLE',
  };
}

function mapPackingError(
  message: string,
  error: unknown,
): PackingSuggestionsRepositoryError {
  if (error instanceof PackingSuggestionsRepositoryError) return error;
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return new PackingSuggestionsRepositoryError('NOT_FOUND', message, { cause: error });
    }
    if (error.status === 0) {
      return new PackingSuggestionsRepositoryError('NETWORK', message, { cause: error });
    }
  }
  return new PackingSuggestionsRepositoryError('REMOTE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
