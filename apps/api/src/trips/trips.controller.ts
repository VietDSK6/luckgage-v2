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
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth.decorators.js';
import { JwtAuthGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ProblemDetailsDto } from '../http/problem-details.dto.js';
import {
  CreateTripDto,
  TripDetailDto,
  TripsPageDto,
  TripsQueryDto,
  UpdateTripDto,
} from './trips.dto.js';
import { TripsService } from './trips.service.js';

@ApiTags('trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trips')
export class TripsController {
  constructor(@Inject(TripsService) private readonly tripsService: TripsService) {}

  @Get()
  @ApiOperation({ summary: 'List trips for the current active membership' })
  @ApiOkResponse({ type: TripsPageDto })
  list(
    @CurrentUser() user: AuthPrincipal,
    @Query() query: TripsQueryDto,
  ): Promise<TripsPageDto> {
    return this.tripsService.list(user.userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a trip and its owner membership atomically' })
  @ApiCreatedResponse({ type: TripDetailDto })
  @ApiUnprocessableEntityResponse({ type: ProblemDetailsDto })
  create(
    @CurrentUser() user: AuthPrincipal,
    @Body() input: CreateTripDto,
  ): Promise<TripDetailDto> {
    return this.tripsService.create(user.userId, input);
  }

  @Get(':tripId')
  @ApiOperation({ summary: 'Get a trip visible to the current member' })
  @ApiOkResponse({ type: TripDetailDto })
  @ApiNotFoundResponse({ type: ProblemDetailsDto })
  get(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
  ): Promise<TripDetailDto> {
    return this.tripsService.getDetail(user.userId, tripId);
  }

  @Patch(':tripId')
  @ApiOperation({ summary: 'Update trip metadata as owner' })
  @ApiOkResponse({ type: TripDetailDto })
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  @ApiConflictResponse({ type: ProblemDetailsDto })
  update(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() input: UpdateTripDto,
  ): Promise<TripDetailDto> {
    return this.tripsService.update(user.userId, tripId, input);
  }

  @Delete(':tripId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a trip and its dependent data as owner' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ type: ProblemDetailsDto })
  async delete(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
  ): Promise<void> {
    await this.tripsService.delete(user.userId, tripId);
  }
}
