import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AdminSessionGuard } from '../auth/admin-session.js';
import { Roles } from '../auth/auth.decorators.js';
import { RolesGuard } from '../auth/auth.guards.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ProblemDetailsDto } from '../http/problem-details.dto.js';
import { AdminDashboardDto } from './admin-dashboard.dto.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

@ApiTags('admin-dashboard')
@ApiCookieAuth('adminSession')
@Controller('admin/dashboard')
@Roles(UserRole.ADMIN)
@UseGuards(AdminSessionGuard, RolesGuard)
export class AdminDashboardController {
  constructor(
    @Inject(AdminDashboardService) private readonly dashboardService: AdminDashboardService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get aggregate metrics for the admin dashboard' })
  @ApiOkResponse({ type: AdminDashboardDto })
  @ApiUnauthorizedResponse({ type: ProblemDetailsDto })
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  getSummary(): Promise<AdminDashboardDto> {
    return this.dashboardService.getSummary();
  }
}
