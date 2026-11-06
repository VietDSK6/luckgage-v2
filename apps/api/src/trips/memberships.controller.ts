import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth.decorators.js';
import { JwtAuthGuard } from '../auth/auth.guards.js';
import { AuthRateLimit, AuthRateLimitGuard } from '../auth/auth-rate-limit.guard.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ProblemDetailsDto } from '../http/problem-details.dto.js';
import { InvitesService } from '../memberships/invites.service.js';
import {
  CreateInviteDto,
  InviteCodeDto,
  InviteCreatedDto,
  InvitePreviewDto,
  TripMembersDto,
} from '../memberships/memberships.dto.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { TripDetailDto } from './trips.dto.js';
import { TripsService } from './trips.service.js';

const FIVE_MINUTES = 5 * 60_000;

@ApiTags('memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MembershipsController {
  constructor(
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
    @Inject(InvitesService) private readonly invites: InvitesService,
    @Inject(TripsService) private readonly trips: TripsService,
  ) {}

  @Get('trips/:tripId/members')
  @ApiOperation({ summary: 'List active trip members without email addresses' })
  @ApiOkResponse({ type: TripMembersDto })
  async listMembers(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
  ): Promise<TripMembersDto> {
    return { items: await this.memberships.list(user.userId, tripId) };
  }

  @Delete('trips/:tripId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an active member as trip owner' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  async removeMember(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Param('userId', new ParseUUIDPipe()) targetUserId: string,
  ): Promise<void> {
    await this.memberships.remove(user.userId, tripId, targetUserId);
  }

  @Post('trips/:tripId/invites')
  @ApiOperation({ summary: 'Create a one-time-visible trip invite code as owner' })
  @ApiCreatedResponse({ type: InviteCreatedDto })
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  createInvite(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() input: CreateInviteDto,
  ): Promise<InviteCreatedDto> {
    return this.invites.create(user.userId, tripId, input);
  }

  @Delete('trips/:tripId/invites/:inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a trip invite as owner' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ProblemDetailsDto })
  async revokeInvite(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Param('inviteId', new ParseUUIDPipe()) inviteId: string,
  ): Promise<void> {
    await this.invites.revoke(user.userId, tripId, inviteId);
  }

  @Post('trip-invites/preview')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    group: 'invite-preview',
    windowMs: FIVE_MINUTES,
    ipLimit: 40,
    identifierLimit: 15,
    identifierField: 'code',
  })
  @ApiOperation({ summary: 'Preview a valid trip invite without joining' })
  @ApiOkResponse({ type: InvitePreviewDto })
  @ApiNotFoundResponse({ type: ProblemDetailsDto })
  previewInvite(@Body() input: InviteCodeDto): Promise<InvitePreviewDto> {
    return this.invites.preview(input.code);
  }

  @Post('trip-invites/join')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    group: 'invite-join',
    windowMs: FIVE_MINUTES,
    ipLimit: 30,
    identifierLimit: 10,
    identifierField: 'code',
  })
  @ApiOperation({ summary: 'Join a trip idempotently using an invite code' })
  @ApiOkResponse({ type: TripDetailDto })
  async joinInvite(
    @CurrentUser() user: AuthPrincipal,
    @Body() input: InviteCodeDto,
  ): Promise<TripDetailDto> {
    const tripId = await this.invites.join(user.userId, input.code);
    return this.trips.getDetail(user.userId, tripId);
  }
}
