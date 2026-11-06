import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { ContentStatus } from '../generated/prisma/enums.js';
import { WeatherStatus } from '../weather/weather.dto.js';
import { generatePackingPreview } from './packing-engine.js';
import type {
  CreatePackingRuleDto,
  PackingPreviewDto,
  PackingRuleDto,
  RuleSampleDto,
  UpdatePackingRuleDto,
} from './packing.dto.js';

const ruleInclude = { items: { orderBy: [{ position: 'asc' as const }] } };

@Injectable()
export class PackingRulesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(): Promise<{ items: PackingRuleDto[] }> {
    const rules = await this.prisma.packingRule.findMany({
      orderBy: [{ key: 'asc' }, { version: 'desc' }],
      include: ruleInclude,
    });
    return { items: rules.map(toRuleDto) };
  }

  async get(ruleId: string): Promise<PackingRuleDto> {
    return toRuleDto(await this.requireRule(ruleId));
  }

  async create(actorId: string, input: CreatePackingRuleDto): Promise<PackingRuleDto> {
    validateRule(input);
    const latest = await this.prisma.packingRule.aggregate({
      where: { key: input.key },
      _max: { version: true },
    });
    const rule = await this.prisma.packingRule.create({
      data: {
        ...ruleData(input),
        version: (latest._max.version ?? 0) + 1,
        createdById: actorId,
        updatedById: actorId,
        items: { create: input.items.map(itemData) },
      },
      include: ruleInclude,
    });
    return toRuleDto(rule);
  }

  async update(
    actorId: string,
    ruleId: string,
    input: UpdatePackingRuleDto,
  ): Promise<PackingRuleDto> {
    if (Object.values(input).every((value) => value === undefined)) {
      throw new UnprocessableEntityException({
        code: 'PACKING_RULE_UPDATE_EMPTY',
        title: 'Validation failed',
        detail: 'Provide at least one packing rule field to update.',
      });
    }
    const existing = await this.requireRule(ruleId);
    if (existing.status === ContentStatus.ARCHIVED) {
      throw new ConflictException({
        code: 'PACKING_RULE_ARCHIVED',
        title: 'Conflict',
        detail: 'Archived packing rules cannot be edited.',
      });
    }
    const merged = mergeRule(existing, input);
    validateRule(merged);
    if (existing.status === ContentStatus.PUBLISHED) {
      const latest = await this.prisma.packingRule.aggregate({
        where: { key: existing.key },
        _max: { version: true },
      });
      const created = await this.prisma.packingRule.create({
        data: {
          ...ruleData(merged),
          version: (latest._max.version ?? existing.version) + 1,
          createdById: actorId,
          updatedById: actorId,
          items: { create: merged.items.map(itemData) },
        },
        include: ruleInclude,
      });
      return toRuleDto(created);
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.packingRuleItem.deleteMany({ where: { ruleId } });
      return transaction.packingRule.update({
        where: { id: ruleId },
        data: {
          ...ruleData(merged),
          updatedById: actorId,
          items: { create: merged.items.map(itemData) },
        },
        include: ruleInclude,
      });
    });
    return toRuleDto(updated);
  }

  async publish(actorId: string, ruleId: string): Promise<PackingRuleDto> {
    const existing = await this.requireRule(ruleId);
    if (existing.status !== ContentStatus.DRAFT) {
      throw invalidStatus('Only draft packing rules can be published.');
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.packingRule.updateMany({
        where: { key: existing.key, status: ContentStatus.PUBLISHED },
        data: { status: ContentStatus.ARCHIVED, updatedById: actorId },
      });
      return transaction.packingRule.update({
        where: { id: ruleId },
        data: {
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedById: actorId,
        },
        include: ruleInclude,
      });
    });
    return toRuleDto(updated);
  }

  async archive(actorId: string, ruleId: string): Promise<PackingRuleDto> {
    await this.requireRule(ruleId);
    const updated = await this.prisma.packingRule.update({
      where: { id: ruleId },
      data: { status: ContentStatus.ARCHIVED, updatedById: actorId },
      include: ruleInclude,
    });
    return toRuleDto(updated);
  }

  async preview(ruleId: string, sample: RuleSampleDto): Promise<PackingPreviewDto> {
    const rule = await this.requireRule(ruleId);
    return generatePackingPreview([rule], sample, weatherStatus(sample));
  }

  private async requireRule(ruleId: string) {
    const rule = await this.prisma.packingRule.findUnique({
      where: { id: ruleId },
      include: ruleInclude,
    });
    if (!rule) {
      throw new NotFoundException({
        code: 'PACKING_RULE_NOT_FOUND',
        title: 'Not found',
        detail: 'The packing rule does not exist.',
      });
    }
    return rule;
  }
}

function ruleData(input: CreatePackingRuleDto) {
  return {
    key: input.key,
    name: input.name,
    priority: input.priority,
    tripType: input.tripType ?? null,
    minDays: input.minDays ?? null,
    maxDays: input.maxDays ?? null,
    minTempC: input.minTempC ?? null,
    maxTempC: input.maxTempC ?? null,
    minRainPercent: input.minRainPercent ?? null,
    activityKey: input.activityKey?.trim() || null,
    reasonVi: input.reasonVi,
    reasonEn: input.reasonEn,
  };
}

function itemData(item: CreatePackingRuleDto['items'][number]) {
  return {
    categoryKey: item.categoryKey,
    categoryNameVi: item.categoryNameVi,
    categoryNameEn: item.categoryNameEn,
    itemKey: item.itemKey,
    itemNameVi: item.itemNameVi,
    itemNameEn: item.itemNameEn,
    quantityMode: item.quantityMode,
    baseQuantity: item.baseQuantity,
    noteVi: item.noteVi?.trim() || null,
    noteEn: item.noteEn?.trim() || null,
    position: item.position,
  };
}

function mergeRule(
  existing: Awaited<ReturnType<PackingRulesService['requireRule']>>,
  input: UpdatePackingRuleDto,
): CreatePackingRuleDto {
  return {
    key: existing.key,
    name: input.name ?? existing.name,
    priority: input.priority ?? existing.priority,
    tripType: input.tripType === undefined ? existing.tripType : input.tripType,
    minDays: input.minDays === undefined ? existing.minDays : input.minDays,
    maxDays: input.maxDays === undefined ? existing.maxDays : input.maxDays,
    minTempC:
      input.minTempC === undefined
        ? existing.minTempC === null
          ? null
          : existing.minTempC.toNumber()
        : input.minTempC,
    maxTempC:
      input.maxTempC === undefined
        ? existing.maxTempC === null
          ? null
          : existing.maxTempC.toNumber()
        : input.maxTempC,
    minRainPercent:
      input.minRainPercent === undefined ? existing.minRainPercent : input.minRainPercent,
    activityKey:
      input.activityKey === undefined ? existing.activityKey : input.activityKey,
    reasonVi: input.reasonVi ?? existing.reasonVi,
    reasonEn: input.reasonEn ?? existing.reasonEn,
    items: input.items ?? existing.items,
  };
}

function validateRule(input: CreatePackingRuleDto): void {
  if (
    (input.minDays != null && input.maxDays != null && input.minDays > input.maxDays) ||
    (input.minTempC != null && input.maxTempC != null && input.minTempC > input.maxTempC)
  ) {
    throw new UnprocessableEntityException({
      code: 'PACKING_RULE_CONDITIONS_INVALID',
      title: 'Validation failed',
      detail: 'Minimum rule conditions cannot exceed their maximum values.',
    });
  }
  const itemKeys = new Set<string>();
  for (const item of input.items) {
    const key = `${item.categoryKey}:${item.itemKey}`;
    if (itemKeys.has(key)) {
      throw new UnprocessableEntityException({
        code: 'PACKING_RULE_ITEM_DUPLICATE',
        title: 'Validation failed',
        detail: 'A rule cannot contain duplicate category and item keys.',
      });
    }
    itemKeys.add(key);
  }
}

function weatherStatus(sample: RuleSampleDto): WeatherStatus {
  return sample.lowTemperatureCelsius === undefined &&
    sample.highTemperatureCelsius === undefined &&
    sample.rainChancePercent === undefined
    ? WeatherStatus.UNAVAILABLE
    : WeatherStatus.FRESH;
}

function invalidStatus(detail: string): ConflictException {
  return new ConflictException({ code: 'PACKING_RULE_STATUS_INVALID', title: 'Conflict', detail });
}

function toRuleDto(rule: {
  id: string;
  key: string;
  name: string;
  status: ContentStatus;
  version: number;
  priority: number;
  tripType: string | null;
  minDays: number | null;
  maxDays: number | null;
  minTempC: { toNumber(): number } | null;
  maxTempC: { toNumber(): number } | null;
  minRainPercent: number | null;
  activityKey: string | null;
  reasonVi: string;
  reasonEn: string;
  publishedAt: Date | null;
  updatedAt: Date;
  items: CreatePackingRuleDto['items'];
}): PackingRuleDto {
  return {
    id: rule.id,
    key: rule.key,
    name: rule.name,
    status: rule.status,
    version: rule.version,
    priority: rule.priority,
    conditions: {
      tripType: rule.tripType,
      minDays: rule.minDays,
      maxDays: rule.maxDays,
      minTempC: rule.minTempC?.toNumber() ?? null,
      maxTempC: rule.maxTempC?.toNumber() ?? null,
      minRainPercent: rule.minRainPercent,
      activityKey: rule.activityKey,
    },
    reasonVi: rule.reasonVi,
    reasonEn: rule.reasonEn,
    items: rule.items,
    publishedAt: rule.publishedAt?.toISOString() ?? null,
    updatedAt: rule.updatedAt.toISOString(),
  };
}
