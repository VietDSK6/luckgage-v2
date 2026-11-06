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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth.decorators.js';
import { JwtAuthGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ProblemDetailsDto } from '../http/problem-details.dto.js';
import { ChecklistProgressDto } from '../trips/trips.dto.js';
import {
  ChecklistCategoryDto,
  ChecklistDto,
  ChecklistItemDto,
  CreateChecklistCategoryDto,
  CreateChecklistItemDto,
  PackedStateDto,
  UpdateChecklistCategoryDto,
  UpdateChecklistItemDto,
} from './checklists.dto.js';
import { ChecklistsService } from './checklists.service.js';

@ApiTags('checklist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ChecklistsController {
  constructor(@Inject(ChecklistsService) private readonly checklists: ChecklistsService) {}

  @Get('trips/:tripId/checklist')
  @ApiOperation({ summary: 'Get a trip checklist as an active member' })
  @ApiOkResponse({ type: ChecklistDto })
  get(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
  ): Promise<ChecklistDto> {
    return this.checklists.get(user.userId, tripId);
  }

  @Post('trips/:tripId/checklist/categories')
  @ApiOperation({ summary: 'Create a checklist category' })
  @ApiCreatedResponse({ type: ChecklistCategoryDto })
  createCategory(
    @CurrentUser() user: AuthPrincipal,
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Body() input: CreateChecklistCategoryDto,
  ): Promise<ChecklistCategoryDto> {
    return this.checklists.createCategory(user.userId, tripId, input);
  }

  @Patch('checklist-categories/:categoryId')
  @ApiOperation({ summary: 'Update a checklist category with optimistic versioning' })
  @ApiOkResponse({ type: ChecklistCategoryDto })
  @ApiConflictResponse({ type: ProblemDetailsDto })
  updateCategory(
    @CurrentUser() user: AuthPrincipal,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() input: UpdateChecklistCategoryDto,
  ): Promise<ChecklistCategoryDto> {
    return this.checklists.updateCategory(user.userId, categoryId, input);
  }

  @Delete('checklist-categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a checklist category and its items' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ProblemDetailsDto })
  async deleteCategory(
    @CurrentUser() user: AuthPrincipal,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
  ): Promise<void> {
    await this.checklists.deleteCategory(user.userId, categoryId);
  }

  @Post('checklist-categories/:categoryId/items')
  @ApiOperation({ summary: 'Create a checklist item' })
  @ApiCreatedResponse({ type: ChecklistItemDto })
  createItem(
    @CurrentUser() user: AuthPrincipal,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() input: CreateChecklistItemDto,
  ): Promise<ChecklistItemDto> {
    return this.checklists.createItem(user.userId, categoryId, input);
  }

  @Patch('checklist-items/:itemId')
  @ApiOperation({ summary: 'Update a checklist item with optimistic versioning' })
  @ApiOkResponse({ type: ChecklistItemDto })
  @ApiConflictResponse({ type: ProblemDetailsDto })
  updateItem(
    @CurrentUser() user: AuthPrincipal,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() input: UpdateChecklistItemDto,
  ): Promise<ChecklistItemDto> {
    return this.checklists.updateItem(user.userId, itemId, input);
  }

  @Delete('checklist-items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a checklist item' })
  @ApiNoContentResponse()
  async deleteItem(
    @CurrentUser() user: AuthPrincipal,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
  ): Promise<void> {
    await this.checklists.deleteItem(user.userId, itemId);
  }

  @Patch('checklist-categories/:categoryId/packed-state')
  @ApiOperation({ summary: 'Set packed state for every item in a category' })
  @ApiOkResponse({ type: ChecklistProgressDto })
  setPackedState(
    @CurrentUser() user: AuthPrincipal,
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body() input: PackedStateDto,
  ): Promise<ChecklistProgressDto> {
    return this.checklists.setCategoryPackedState(user.userId, categoryId, input.isPacked);
  }
}
