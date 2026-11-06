import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiCreatedResponse, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { AdminCsrfGuard, AdminSessionGuard } from '../auth/admin-session.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { UserRole } from '../generated/prisma/enums.js';
import {
  AdminTripSuggestionDto,
  AdminTripSuggestionsPageDto,
  CreateTripSuggestionDto,
  TripSuggestionDto,
  TripSuggestionDetailQueryDto,
  TripSuggestionsPageDto,
  TripSuggestionsQueryDto,
  UpdateTripSuggestionDto,
} from './trip-suggestions.dto.js';
import { TripSuggestionsService } from './trip-suggestions.service.js';

@ApiTags('trip-suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trip-suggestions')
export class TripSuggestionsController {
  constructor(@Inject(TripSuggestionsService) private readonly suggestions: TripSuggestionsService) {}

  @Get()
  @ApiOkResponse({ type: TripSuggestionsPageDto })
  list(@Query() query: TripSuggestionsQueryDto): Promise<TripSuggestionsPageDto> {
    return this.suggestions.listPublic(query);
  }

  @Get(':slug')
  @ApiOkResponse({ type: TripSuggestionDto })
  get(
    @Param('slug') slug: string,
    @Query() query: TripSuggestionDetailQueryDto,
  ): Promise<TripSuggestionDto> {
    return this.suggestions.getPublic(slug, query.locale);
  }
}

@ApiTags('admin-trip-suggestions')
@ApiCookieAuth('adminSession')
@Controller('admin/trip-suggestions')
@Roles(UserRole.ADMIN)
@UseGuards(AdminSessionGuard, RolesGuard)
export class AdminTripSuggestionsController {
  constructor(@Inject(TripSuggestionsService) private readonly suggestions: TripSuggestionsService) {}

  @Get()
  @ApiOkResponse({ type: AdminTripSuggestionsPageDto })
  list(): Promise<AdminTripSuggestionsPageDto> {
    return this.suggestions.listAdmin();
  }

  @Get(':id')
  @ApiOkResponse({ type: AdminTripSuggestionDto })
  get(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminTripSuggestionDto> {
    return this.suggestions.getAdmin(id);
  }

  @Post()
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiCreatedResponse({ type: AdminTripSuggestionDto })
  create(
    @CurrentUser() actor: AuthPrincipal,
    @Body() input: CreateTripSuggestionDto,
  ): Promise<AdminTripSuggestionDto> {
    return this.suggestions.create(actor.userId, input);
  }

  @Patch(':id')
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOkResponse({ type: AdminTripSuggestionDto })
  update(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateTripSuggestionDto,
  ): Promise<AdminTripSuggestionDto> {
    return this.suggestions.update(actor.userId, id, input);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOkResponse({ type: AdminTripSuggestionDto })
  publish(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AdminTripSuggestionDto> {
    return this.suggestions.publish(actor.userId, id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOkResponse({ type: AdminTripSuggestionDto })
  archive(
    @CurrentUser() actor: AuthPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<AdminTripSuggestionDto> {
    return this.suggestions.archive(actor.userId, id);
  }
}
