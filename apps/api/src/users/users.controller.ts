import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { AdminCsrfGuard, AdminSessionGuard } from '../auth/admin-session.js';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ProblemDetailsDto } from '../http/problem-details.dto.js';
import { AdminUserDto, UserDto } from './user.dto.js';
import {
  AdminUsersPageDto,
  AdminUsersQueryDto,
  UpdateMeDto,
  UpdateUserStatusDto,
} from './users.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  getCurrent(@CurrentUser() principal: AuthPrincipal): Promise<UserDto> {
    return this.usersService.getCurrent(principal.userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({ type: UserDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiUnprocessableEntityResponse({ type: ProblemDetailsDto })
  updateCurrent(
    @CurrentUser() principal: AuthPrincipal,
    @Body() input: UpdateMeDto,
  ): Promise<UserDto> {
    return this.usersService.updateCurrent(principal.userId, input);
  }
}

@ApiTags('admin-users')
@ApiCookieAuth('adminSession')
@Controller('admin/users')
@Roles(UserRole.ADMIN)
@UseGuards(AdminSessionGuard, RolesGuard)
export class AdminUsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List and search users' })
  @ApiOkResponse({ type: AdminUsersPageDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  list(@Query() query: AdminUsersQueryDto): Promise<AdminUsersPageDto> {
    return this.usersService.listAdminUsers(query);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get a user for administration' })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiNotFoundResponse({ type: ProblemDetailsDto })
  get(@Param('userId', new ParseUUIDPipe()) userId: string): Promise<AdminUserDto> {
    return this.usersService.getAdminUser(userId);
  }

  @Patch(':userId/status')
  @UseGuards(AdminCsrfGuard)
  @ApiHeader({ name: 'x-csrf-token', required: true })
  @ApiOperation({ summary: 'Suspend or reactivate a user' })
  @ApiOkResponse({ type: AdminUserDto })
  @ApiConflictResponse({ type: ProblemDetailsDto })
  @ApiNotFoundResponse({ type: ProblemDetailsDto })
  updateStatus(
    @CurrentUser() actor: AuthPrincipal,
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() input: UpdateUserStatusDto,
  ): Promise<AdminUserDto> {
    return this.usersService.updateStatus(actor, userId, input.status);
  }
}
