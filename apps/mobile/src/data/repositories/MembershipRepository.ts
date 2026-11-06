import { ApiClient, ApiClientError } from '@/data/remote/ApiClient';
import type {
  ApiInviteCreated,
  ApiInvitePreview,
  ApiTrip,
  ApiTripMember,
  ApiTripMembers,
} from '@/data/remote/apiTypes';
import { parseCalendarDate, type CalendarDate } from '@/features/trips/domain/calendarDate';
import type { Trip, TripMemberRole } from '@/features/trips/domain/trip';

import { mapApiTrip } from './RemoteTripRepository';

export type MembershipRepositoryErrorCode =
  | 'VALIDATION'
  | 'INVITE_INVALID'
  | 'INVITE_EXPIRED'
  | 'INVITE_REVOKED'
  | 'INVITE_MAX_USES_REACHED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'REMOTE';

export class MembershipRepositoryError extends Error {
  constructor(
    readonly code: MembershipRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'MembershipRepositoryError';
  }
}

export type InvitePreview = {
  tripId: string;
  tripName: string;
  destination: string;
  startDate: CalendarDate;
  endDate: CalendarDate;
  ownerDisplayName: string;
  memberCount: number;
  expiresAt: number;
};

export type TripMember = {
  userId: string;
  displayName: string;
  role: TripMemberRole;
  joinedAt: number;
};

export type TripInvite = {
  id: string;
  code: string;
  expiresAt: number;
  maxUses: number;
  useCount: number;
};

export interface MembershipRepository {
  previewInvite(code: string): Promise<InvitePreview>;
  joinInvite(code: string): Promise<Trip>;
  listMembers(tripId: string): Promise<TripMember[]>;
  createInvite(
    tripId: string,
    input: { expiresInHours: number; maxUses: number },
  ): Promise<TripInvite>;
  revokeInvite(tripId: string, inviteId: string): Promise<void>;
  removeMember(tripId: string, userId: string): Promise<void>;
}

export class RemoteMembershipRepository implements MembershipRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async previewInvite(code: string): Promise<InvitePreview> {
    const normalized = requireInviteCode(code);
    try {
      const payload = await this.apiClient.request<ApiInvitePreview>('/trip-invites/preview', {
        method: 'POST',
        body: { code: normalized },
      });
      return mapInvitePreview(payload);
    } catch (error) {
      throw mapMembershipError('Could not preview invite', error);
    }
  }

  async joinInvite(code: string): Promise<Trip> {
    const normalized = requireInviteCode(code);
    try {
      const payload = await this.apiClient.request<ApiTrip>('/trip-invites/join', {
        method: 'POST',
        body: { code: normalized },
      });
      return mapApiTrip(payload);
    } catch (error) {
      throw mapMembershipError('Could not join trip', error);
    }
  }

  async listMembers(tripId: string): Promise<TripMember[]> {
    try {
      const payload = await this.apiClient.request<ApiTripMembers>(`/trips/${tripId}/members`);
      if (!payload || !Array.isArray(payload.items)) throw invalidResponse();
      return payload.items.map(mapMember).sort((first, second) => {
        if (first.role !== second.role) return first.role === 'owner' ? -1 : 1;
        return first.joinedAt - second.joinedAt;
      });
    } catch (error) {
      throw mapMembershipError('Could not load trip members', error);
    }
  }

  async createInvite(
    tripId: string,
    input: { expiresInHours: number; maxUses: number },
  ): Promise<TripInvite> {
    if (
      !Number.isInteger(input.expiresInHours) ||
      input.expiresInHours < 1 ||
      input.expiresInHours > 168 ||
      !Number.isInteger(input.maxUses) ||
      input.maxUses < 1 ||
      input.maxUses > 50
    ) {
      throw new MembershipRepositoryError('VALIDATION', 'Invite options are invalid');
    }
    try {
      const payload = await this.apiClient.request<ApiInviteCreated>(
        `/trips/${tripId}/invites`,
        { method: 'POST', body: input },
      );
      return mapInvite(payload);
    } catch (error) {
      throw mapMembershipError('Could not create invite', error);
    }
  }

  async revokeInvite(tripId: string, inviteId: string): Promise<void> {
    try {
      await this.apiClient.request<void>(`/trips/${tripId}/invites/${inviteId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw mapMembershipError('Could not revoke invite', error);
    }
  }

  async removeMember(tripId: string, userId: string): Promise<void> {
    try {
      await this.apiClient.request<void>(`/trips/${tripId}/members/${userId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw mapMembershipError('Could not remove trip member', error);
    }
  }
}

function requireInviteCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (normalized.length < 8 || normalized.length > 32) {
    throw new MembershipRepositoryError('VALIDATION', 'Invite code has an invalid format');
  }
  return normalized;
}

function mapInvitePreview(payload: ApiInvitePreview): InvitePreview {
  const startDate = parseCalendarDate(payload?.startDate);
  const endDate = parseCalendarDate(payload?.endDate);
  const expiresAt = Date.parse(payload?.expiresAt);
  if (
    !payload?.tripId ||
    !payload.tripName ||
    !payload.destinationLabel ||
    !payload.ownerDisplayName ||
    !startDate ||
    !endDate ||
    !Number.isInteger(payload.memberCount) ||
    payload.memberCount < 1 ||
    !Number.isFinite(expiresAt)
  ) {
    throw invalidResponse();
  }
  return {
    tripId: payload.tripId,
    tripName: payload.tripName,
    destination: payload.destinationLabel,
    startDate,
    endDate,
    ownerDisplayName: payload.ownerDisplayName,
    memberCount: payload.memberCount,
    expiresAt,
  };
}

function mapMember(payload: ApiTripMember): TripMember {
  const joinedAt = Date.parse(payload?.joinedAt);
  if (
    !payload?.userId ||
    !payload.displayName ||
    (payload.role !== 'OWNER' && payload.role !== 'MEMBER') ||
    !Number.isFinite(joinedAt)
  ) {
    throw invalidResponse();
  }
  return {
    userId: payload.userId,
    displayName: payload.displayName,
    role: payload.role === 'OWNER' ? 'owner' : 'member',
    joinedAt,
  };
}

function mapInvite(payload: ApiInviteCreated): TripInvite {
  const expiresAt = Date.parse(payload?.expiresAt);
  if (
    !payload?.id ||
    !payload.code ||
    !Number.isFinite(expiresAt) ||
    !Number.isInteger(payload.maxUses) ||
    !Number.isInteger(payload.useCount)
  ) {
    throw invalidResponse();
  }
  return { ...payload, expiresAt };
}

function invalidResponse(): MembershipRepositoryError {
  return new MembershipRepositoryError('REMOTE', 'Membership response contains invalid data');
}

function mapMembershipError(message: string, error: unknown): MembershipRepositoryError {
  if (error instanceof MembershipRepositoryError) return error;
  if (error instanceof ApiClientError) {
    if (
      error.code === 'INVITE_INVALID' ||
      error.code === 'INVITE_EXPIRED' ||
      error.code === 'INVITE_REVOKED' ||
      error.code === 'INVITE_MAX_USES_REACHED'
    ) {
      return new MembershipRepositoryError(error.code, message, { cause: error });
    }
    if (error.status === 403) {
      return new MembershipRepositoryError('FORBIDDEN', message, { cause: error });
    }
    if (error.status === 404) {
      return new MembershipRepositoryError('NOT_FOUND', message, { cause: error });
    }
    if (error.status === 0) {
      return new MembershipRepositoryError('NETWORK', message, { cause: error });
    }
  }
  return new MembershipRepositoryError('REMOTE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
