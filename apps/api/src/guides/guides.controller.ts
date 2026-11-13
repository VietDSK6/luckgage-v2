import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { AdminCsrfGuard, AdminSessionGuard } from '../auth/admin-session.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { UserRole } from '../generated/prisma/enums.js';
import { AdminGuideDto, AdminGuidePageDto, GuideDetailDto, GuideInputDto, GuidePageDto, GuideQueryDto } from './guides.dto.js';
import { GuidesService } from './guides.service.js';

@ApiTags('guides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('guides')
export class GuidesController {
  constructor(@Inject(GuidesService) private readonly guides: GuidesService) {}
  @Get() @ApiOkResponse({ type: GuidePageDto }) list(@CurrentUser() user: AuthPrincipal, @Query() query: GuideQueryDto): Promise<GuidePageDto> { return this.guides.list(user.userId, query); }
  @Get('saved') @ApiOkResponse({ type: GuidePageDto }) saved(@CurrentUser() user: AuthPrincipal, @Query() query: GuideQueryDto): Promise<GuidePageDto> { return this.guides.saved(user.userId, query); }
  @Get(':slug') @ApiOkResponse({ type: GuideDetailDto }) detail(@CurrentUser() user: AuthPrincipal, @Param('slug') slug: string, @Query() query: GuideQueryDto): Promise<GuideDetailDto> { return this.guides.detail(user.userId, slug, query.locale); }
  @Put(':slug/save') @ApiOkResponse({ type: Object }) save(@CurrentUser() user: AuthPrincipal, @Param('slug') slug: string): Promise<{ isSaved: boolean }> { return this.guides.save(user.userId, slug); }
  @Delete(':slug/save') @ApiOkResponse({ type: Object }) unsave(@CurrentUser() user: AuthPrincipal, @Param('slug') slug: string): Promise<{ isSaved: boolean }> { return this.guides.unsave(user.userId, slug); }
}

@ApiTags('admin-guides')
@ApiCookieAuth('adminSession')
@Roles(UserRole.ADMIN)
@UseGuards(AdminSessionGuard, RolesGuard)
@Controller('admin/guides')
export class AdminGuidesController {
  constructor(@Inject(GuidesService) private readonly guides: GuidesService) {}
  @Get() @ApiOkResponse({ type: AdminGuidePageDto }) list(): Promise<AdminGuidePageDto> { return this.guides.listAdmin(); }
  @Get(':id') @ApiOkResponse({ type: AdminGuideDto }) get(@Param('id', new ParseUUIDPipe()) id: string): Promise<AdminGuideDto> { return this.guides.getAdmin(id); }
  @Post() @UseGuards(AdminCsrfGuard) @ApiHeader({ name: 'x-csrf-token' }) create(@CurrentUser() actor: AuthPrincipal, @Body() input: GuideInputDto): Promise<AdminGuideDto> { return this.guides.create(actor.userId, input); }
  @Patch(':id') @UseGuards(AdminCsrfGuard) @ApiHeader({ name: 'x-csrf-token' }) update(@CurrentUser() actor: AuthPrincipal, @Param('id', new ParseUUIDPipe()) id: string, @Body() input: GuideInputDto): Promise<AdminGuideDto> { return this.guides.update(actor.userId, id, input); }
  @Post(':id/publish') @HttpCode(HttpStatus.OK) @UseGuards(AdminCsrfGuard) @ApiHeader({ name: 'x-csrf-token' }) publish(@CurrentUser() actor: AuthPrincipal, @Param('id', new ParseUUIDPipe()) id: string): Promise<AdminGuideDto> { return this.guides.publish(actor.userId, id); }
  @Post(':id/archive') @HttpCode(HttpStatus.OK) @UseGuards(AdminCsrfGuard) @ApiHeader({ name: 'x-csrf-token' }) archive(@CurrentUser() actor: AuthPrincipal, @Param('id', new ParseUUIDPipe()) id: string): Promise<AdminGuideDto> { return this.guides.archive(actor.userId, id); }
  @Delete(':id') @HttpCode(HttpStatus.OK) @UseGuards(AdminCsrfGuard) @ApiHeader({ name: 'x-csrf-token' }) delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<{ deleted: boolean }> { return this.guides.delete(id); }
}
