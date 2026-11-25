import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { calculateChecklistProgress } from './checklist-progress.js';
import type {
  ChecklistCategoryDto,
  ChecklistDto,
  ChecklistItemDto,
  CreateChecklistCategoryDto,
  CreateChecklistItemDto,
  ImportChecklistDto,
  UpdateChecklistCategoryDto,
  UpdateChecklistItemDto,
} from './checklists.dto.js';

@Injectable()
export class ChecklistsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
  ) {}

  async get(userId: string, tripId: string): Promise<ChecklistDto> {
    await this.memberships.requireMember(userId, tripId);
    const categories = await this.prisma.checklistCategory.findMany({
      where: { tripId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: {
        items: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] },
      },
    });
    let packedItems = 0;
    let totalItems = 0;
    const categoryDtos = categories.map((category) => {
      totalItems += category.items.length;
      packedItems += category.items.filter((item) => item.isPacked).length;
      return toCategoryDto(category);
    });
    return {
      tripId,
      progress: calculateChecklistProgress(packedItems, totalItems),
      categories: categoryDtos,
    };
  }

  async createCategory(
    userId: string,
    tripId: string,
    input: CreateChecklistCategoryDto,
  ): Promise<ChecklistCategoryDto> {
    await this.memberships.requireMember(userId, tripId);
    const position = input.position ?? (await this.nextCategoryPosition(tripId));
    const category = await this.prisma.checklistCategory.create({
      data: { tripId, name: input.name, position },
    });
    return { ...toCategoryBase(category), items: [] };
  }

  async updateCategory(
    userId: string,
    categoryId: string,
    input: UpdateChecklistCategoryDto,
  ): Promise<ChecklistCategoryDto> {
    const category = await this.getCategoryForMember(userId, categoryId);
    if (input.name === undefined && input.position === undefined) {
      throw emptyUpdate();
    }
    const updated = await this.prisma.checklistCategory.updateMany({
      where: { id: categoryId, version: input.version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw versionConflict('CATEGORY_VERSION_CONFLICT', 'category');
    }
    const result = await this.prisma.checklistCategory.findUniqueOrThrow({
      where: { id: category.id },
      include: { items: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
    });
    return toCategoryDto(result);
  }

  async deleteCategory(userId: string, categoryId: string): Promise<void> {
    await this.getCategoryForMember(userId, categoryId);
    await this.prisma.checklistCategory.delete({ where: { id: categoryId } });
  }

  async createItem(
    userId: string,
    categoryId: string,
    input: CreateChecklistItemDto,
  ): Promise<ChecklistItemDto> {
    const category = await this.getCategoryForMember(userId, categoryId);
    if (input.assignedToUserId) await this.requireActiveAssignee(input.assignedToUserId, category.tripId);
    const position = input.position ?? (await this.nextItemPosition(categoryId));
    const item = await this.prisma.checklistItem.create({
      data: {
        categoryId,
        name: input.name,
        quantity: input.quantity,
        note: input.note?.trim() || null,
        assignedToUserId: input.assignedToUserId ?? null,
        isEssential: input.isEssential ?? false,
        position,
        createdByUserId: userId,
      },
    });
    return toItemDto(item);
  }

  async updateItem(
    userId: string,
    itemId: string,
    input: UpdateChecklistItemDto,
  ): Promise<ChecklistItemDto> {
    const item = await this.getItemForMember(userId, itemId);
    if (input.assignedToUserId) await this.requireActiveAssignee(input.assignedToUserId, item.category.tripId);
    if (
      input.name === undefined &&
      input.quantity === undefined &&
      input.isPacked === undefined &&
      input.note === undefined &&
      input.position === undefined &&
      input.assignedToUserId === undefined &&
      input.isEssential === undefined
    ) {
      throw emptyUpdate();
    }
    const updated = await this.prisma.checklistItem.updateMany({
      where: { id: itemId, version: input.version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.isPacked !== undefined
          ? { isPacked: input.isPacked, packedChangedByUserId: userId }
          : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
        ...(input.assignedToUserId !== undefined ? { assignedToUserId: input.assignedToUserId } : {}),
        ...(input.isEssential !== undefined ? { isEssential: input.isEssential } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw versionConflict('ITEM_VERSION_CONFLICT', 'item');
    }
    return toItemDto(await this.prisma.checklistItem.findUniqueOrThrow({ where: { id: itemId } }));
  }

  async deleteItem(userId: string, itemId: string): Promise<void> {
    await this.getItemForMember(userId, itemId);
    await this.prisma.checklistItem.delete({ where: { id: itemId } });
  }

  async importFromTrip(userId: string, tripId: string, input: ImportChecklistDto): Promise<ChecklistDto> {
    await this.memberships.requireMember(userId, tripId);
    await this.memberships.requireMember(userId, input.sourceTripId);
    if (tripId === input.sourceTripId) {
      throw new UnprocessableEntityException({ code: 'CHECKLIST_IMPORT_SAME_TRIP', title: 'Invalid source', detail: 'Choose a different trip.' });
    }
    const selectedIds = input.items.map((item) => item.sourceItemId);
    if (new Set(selectedIds).size !== selectedIds.length) {
      throw new UnprocessableEntityException({ code: 'CHECKLIST_IMPORT_DUPLICATE_ITEM', title: 'Invalid items', detail: 'Select each source item once.' });
    }
    await this.prisma.$transaction(async (transaction) => {
      const sourceCategories = await transaction.checklistCategory.findMany({
        where: { tripId: input.sourceTripId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: { items: { orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
      });
      const selected = new Map(input.items.map((item) => [item.sourceItemId, item]));
      const sourceCount = sourceCategories.reduce((count, category) =>
        count + category.items.filter((item) => selected.has(item.id)).length, 0);
      if (sourceCount !== input.items.length) {
        throw new UnprocessableEntityException({ code: 'CHECKLIST_IMPORT_INVALID_ITEM', title: 'Invalid items', detail: 'One or more selected items are not in the source trip.' });
      }
      const last = await transaction.checklistCategory.aggregate({ where: { tripId }, _max: { position: true } });
      let position = (last._max.position ?? -1) + 1;
      for (const category of sourceCategories) {
        const items = category.items.flatMap((source) => {
          const edited = selected.get(source.id);
          return edited ? [{
            name: edited.name,
            quantity: edited.quantity,
            note: edited.note?.trim() || null,
            position: source.position,
            createdByUserId: userId,
          }] : [];
        });
        if (items.length === 0) continue;
        await transaction.checklistCategory.create({
          data: { tripId, name: category.name, position: position++, items: { create: items } },
        });
      }
    });
    return this.get(userId, tripId);
  }

  async setCategoryPackedState(
    userId: string,
    categoryId: string,
    isPacked: boolean,
  ): Promise<ChecklistDto['progress']> {
    const category = await this.getCategoryForMember(userId, categoryId);
    await this.prisma.$transaction(async (transaction) => {
      await transaction.checklistItem.updateMany({
        where: { categoryId, isPacked: { not: isPacked } },
        data: { isPacked, packedChangedByUserId: userId, version: { increment: 1 } },
      });
    });
    return this.getProgress(category.tripId);
  }

  private async getProgress(tripId: string): Promise<ChecklistDto['progress']> {
    const [totalItems, packedItems] = await this.prisma.$transaction([
      this.prisma.checklistItem.count({ where: { category: { tripId } } }),
      this.prisma.checklistItem.count({ where: { category: { tripId }, isPacked: true } }),
    ]);
    return calculateChecklistProgress(packedItems, totalItems);
  }

  private async getCategoryForMember(userId: string, categoryId: string) {
    const category = await this.prisma.checklistCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, tripId: true },
    });
    if (!category) {
      throw categoryNotFound();
    }
    await this.memberships.requireMember(userId, category.tripId);
    return category;
  }

  private async getItemForMember(userId: string, itemId: string) {
    const item = await this.prisma.checklistItem.findUnique({
      where: { id: itemId },
      select: { id: true, category: { select: { tripId: true } } },
    });
    if (!item) {
      throw itemNotFound();
    }
    await this.memberships.requireMember(userId, item.category.tripId);
    return item;
  }

  private async requireActiveAssignee(assigneeId: string, tripId: string): Promise<void> {
    const member = await this.prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId: assigneeId } },
      select: { removedAt: true },
    });
    if (!member || member.removedAt) {
      throw new UnprocessableEntityException({ code: 'CHECKLIST_ASSIGNEE_NOT_MEMBER', title: 'Invalid assignee', detail: 'Choose an active trip member.' });
    }
  }

  private async nextCategoryPosition(tripId: string): Promise<number> {
    const aggregate = await this.prisma.checklistCategory.aggregate({
      where: { tripId },
      _max: { position: true },
    });
    return (aggregate._max.position ?? -1) + 1;
  }

  private async nextItemPosition(categoryId: string): Promise<number> {
    const aggregate = await this.prisma.checklistItem.aggregate({
      where: { categoryId },
      _max: { position: true },
    });
    return (aggregate._max.position ?? -1) + 1;
  }
}

function toCategoryBase(category: {
  id: string;
  name: string;
  position: number;
  version: number;
}): Omit<ChecklistCategoryDto, 'items'> {
  return {
    id: category.id,
    name: category.name,
    position: category.position,
    version: category.version,
  };
}

function toCategoryDto(category: {
  id: string;
  name: string;
  position: number;
  version: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    isPacked: boolean;
    isEssential: boolean;
    assignedToUserId: string | null;
    packedChangedByUserId: string | null;
    note: string | null;
    position: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): ChecklistCategoryDto {
  return { ...toCategoryBase(category), items: category.items.map(toItemDto) };
}

function toItemDto(item: {
  id: string;
  name: string;
  quantity: number;
  isPacked: boolean;
  isEssential: boolean;
  assignedToUserId: string | null;
  packedChangedByUserId: string | null;
  note: string | null;
  position: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): ChecklistItemDto {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    isPacked: item.isPacked,
    isEssential: item.isEssential,
    assignedToUserId: item.assignedToUserId,
    packedChangedByUserId: item.packedChangedByUserId,
    note: item.note,
    position: item.position,
    version: item.version,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function categoryNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'CHECKLIST_CATEGORY_NOT_FOUND',
    title: 'Not found',
    detail: 'The checklist category does not exist or is not available.',
  });
}

function itemNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'CHECKLIST_ITEM_NOT_FOUND',
    title: 'Not found',
    detail: 'The checklist item does not exist or is not available.',
  });
}

function emptyUpdate(): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: 'VALIDATION_FAILED',
    title: 'Validation failed',
    detail: 'At least one field must be provided.',
    fieldErrors: [
      {
        field: 'body',
        code: 'AT_LEAST_ONE_FIELD_REQUIRED',
        message: 'Provide at least one field to update.',
      },
    ],
  });
}

function versionConflict(code: string, resource: string): ConflictException {
  return new ConflictException({
    code,
    title: 'Checklist changed',
    detail: `The checklist ${resource} changed. Refresh and try again.`,
  });
}
