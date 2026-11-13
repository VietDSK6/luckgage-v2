import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { AdminSessionGuard } from '../auth/admin-session.js';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { UserRole } from '../generated/prisma/enums.js';
import { LocationSearchQueryDto, LocationsResponseDto, WeatherResponseDto } from './weather.dto.js';
import { WeatherService } from './weather.service.js';

@ApiTags('weather')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class WeatherController {
  constructor(@Inject(WeatherService) private readonly weather: WeatherService) {}

  @Get('locations/search')
  @ApiOperation({ summary: 'Search normalized Open-Meteo locations' })
  @ApiOkResponse({ type: LocationsResponseDto })
  async search(@Query() query: LocationSearchQueryDto): Promise<LocationsResponseDto> {
    return { items: await this.weather.searchLocations(query.q, query.locale) };
  }

  @Get('trips/:tripId/weather')
  @ApiOperation({ summary: 'Get fresh, cached, or unavailable weather without blocking trip flows' })
  @ApiOkResponse({ type: WeatherResponseDto })
  getTripWeather(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
  ): Promise<WeatherResponseDto> {
    return this.weather.getTripWeather(user.userId, tripId);
  }
}

@ApiTags('admin-locations')
@ApiCookieAuth('adminSession')
@Controller('admin/locations')
@Roles(UserRole.ADMIN)
@UseGuards(AdminSessionGuard, RolesGuard)
export class AdminLocationsController {
  constructor(@Inject(WeatherService) private readonly weather: WeatherService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search normalized locations for admin content prefill' })
  @ApiOkResponse({ type: LocationsResponseDto })
  async search(@Query() query: LocationSearchQueryDto): Promise<LocationsResponseDto> {
    return { items: await this.weather.searchLocations(query.q, query.locale) };
  }
}
