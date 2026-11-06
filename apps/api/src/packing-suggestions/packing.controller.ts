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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { AdminCsrfGuard, AdminSessionGuard } from '../auth/admin-session.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { UserRole } from '../generated/prisma/enums.js';
import {
  ApplyPackingRequestDto,
  ApplyPackingResponseDto,
  CreatePackingRuleDto,
  PackingPreviewDto,
  PackingPreviewRequestDto,
  PackingRuleDto,
  PackingRulesPageDto,
  RuleSampleDto,
  UpdatePackingRuleDto,
} from './packing.dto.js';
import { PackingRulesService } from './packing-rules.service.js';
import { PackingSuggestionsService } from './packing-suggestions.service.js';

@ApiTags('packing-suggestions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trips/:tripId/packing-suggestions')
export class PackingSuggestionsController {
  constructor(
    @Inject(PackingSuggestionsService) private readonly suggestions: PackingSuggestionsService,
  ) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Preview deterministic suggestions without writing checklist data' })
  @ApiOkResponse({ type: PackingPreviewDto })
  preview(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() input: PackingPreviewRequestDto,
  ): Promise<PackingPreviewDto> {
    return this.suggestions.preview(user.userId, tripId, input);
  }

  @Post('apply')
  @ApiOperation({ summary: 'Atomically append the user-confirmed snapshot to a checklist' })
  @ApiCreatedResponse({ type: ApplyPackingResponseDto })
  apply(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() input: ApplyPackingRequestDto,
  ): Promise<ApplyPackingResponseDto> {
    return this.suggestions.apply(user.userId, tripId, input);
  }
}

@ApiTags('admin-packing-rules')
@ApiCookieAuth('adminSession')
@Controller('admin/packing-rules')
@Roles(UserRole.ADMIN)
@UseGuards(AdminSessionGuard, RolesGuard)
export class AdminPackingRulesController {
  constructor(@Inject(PackingRulesService) private readonly rules: PackingRulesService) {}

  @Get()
  @ApiOkResponse({ type: PackingRulesPageDto })
  list(): Promise<PackingRulesPageDto> {
    return this.rules.list();
  }

  @Get(':ruleId')
  @ApiOkResponse({ type: PackingRuleDto })
  get(@Param('ruleId', new ParseUUIDPipe()) ruleId: string): Promise<PackingRuleDto> {
    return this.rules.get(ruleId);
  }

  @Post()
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiCreatedResponse({ type: PackingRuleDto })
  create(
    @CurrentUser() actor: AuthPrincipal,
    @Body() input: CreatePackingRuleDto,
  ): Promise<PackingRuleDto> {
    return this.rules.create(actor.userId, input);
  }

  @Patch(':ruleId')
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOkResponse({ type: PackingRuleDto })
  update(
    @CurrentUser() actor: AuthPrincipal,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Body() input: UpdatePackingRuleDto,
  ): Promise<PackingRuleDto> {
    return this.rules.update(actor.userId, ruleId, input);
  }

  @Post(':ruleId/preview')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOkResponse({ type: PackingPreviewDto })
  preview(
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
    @Body() input: RuleSampleDto,
  ): Promise<PackingPreviewDto> {
    return this.rules.preview(ruleId, input);
  }

  @Post(':ruleId/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOkResponse({ type: PackingRuleDto })
  publish(
    @CurrentUser() actor: AuthPrincipal,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
  ): Promise<PackingRuleDto> {
    return this.rules.publish(actor.userId, ruleId);
  }

  @Post(':ruleId/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOkResponse({ type: PackingRuleDto })
  archive(
    @CurrentUser() actor: AuthPrincipal,
    @Param('ruleId', new ParseUUIDPipe()) ruleId: string,
  ): Promise<PackingRuleDto> {
    return this.rules.archive(actor.userId, ruleId);
  }
}
