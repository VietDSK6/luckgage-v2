import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth.decorators.js';
import { JwtAuthGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
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
