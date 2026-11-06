import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  ContentStatus,
  QuantityMode,
  TripType,
  UserLocale,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/enums.js';
import { hashPassword } from '../src/auth/password.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

try {
  await prisma.$queryRaw`SELECT 1`;
  await seedPackingRules();
  await seedTripSuggestions();
  await seedDemoUser();
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (Boolean(adminEmail) !== Boolean(adminPassword)) {
    throw new Error('Set both SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD, or neither.');
  }

  if (adminEmail && adminPassword) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      throw new Error('SEED_ADMIN_EMAIL must be a valid email address.');
    }
    if (adminPassword.length < 10 || adminPassword.length > 128) {
      throw new Error('SEED_ADMIN_PASSWORD must contain between 10 and 128 characters.');
    }
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing && existing.role !== UserRole.ADMIN) {
      throw new Error('SEED_ADMIN_EMAIL already belongs to a non-admin account.');
    }
    const displayName = process.env.SEED_ADMIN_DISPLAY_NAME?.trim() || 'Luckgage Admin';
    if (displayName.length > 80) {
      throw new Error('SEED_ADMIN_DISPLAY_NAME must not exceed 80 characters.');
    }
    if (!existing) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          passwordHash: await hashPassword(adminPassword),
          displayName,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          locale: UserLocale.vi,
        },
      });
      console.info('Local admin bootstrap completed.');
    } else {
      console.info('Local admin already exists; credentials were not changed.');
    }
  } else {
    console.info('Seed completed without an admin; optional bootstrap variables were not set.');
  }
} finally {
  await prisma.$disconnect();
}

async function seedPackingRules(): Promise<void> {
  const baseItems = [
    {
      categoryKey: 'documents',
      categoryNameVi: 'Giấy tờ',
      categoryNameEn: 'Documents',
      itemKey: 'identity-document',
      itemNameVi: 'Giấy tờ tùy thân',
      itemNameEn: 'Identity document',
      quantityMode: QuantityMode.FIXED,
      baseQuantity: 1,
      position: 0,
    },
    {
      categoryKey: 'clothing',
      categoryNameVi: 'Quần áo',
      categoryNameEn: 'Clothing',
      itemKey: 'daily-outfit',
      itemNameVi: 'Bộ quần áo theo ngày',
      itemNameEn: 'Daily outfit',
      quantityMode: QuantityMode.PER_DAY,
      baseQuantity: 1,
      position: 1,
    },
    {
      categoryKey: 'essentials',
      categoryNameVi: 'Đồ thiết yếu',
      categoryNameEn: 'Essentials',
      itemKey: 'phone-charger',
      itemNameVi: 'Sạc điện thoại',
      itemNameEn: 'Phone charger',
      quantityMode: QuantityMode.FIXED,
      baseQuantity: 1,
      position: 2,
    },
  ];
  await prisma.packingRule.upsert({
    where: { key_version: { key: 'baseline-essentials', version: 1 } },
    create: {
      key: 'baseline-essentials',
      name: 'Baseline travel essentials',
      version: 1,
      priority: 10,
      status: ContentStatus.PUBLISHED,
      reasonVi: 'Đồ thiết yếu cho mọi chuyến đi',
      reasonEn: 'Essentials for every trip',
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      items: { create: baseItems },
    },
    update: {
      name: 'Baseline travel essentials',
      priority: 10,
      status: ContentStatus.PUBLISHED,
      reasonVi: 'Đồ thiết yếu cho mọi chuyến đi',
      reasonEn: 'Essentials for every trip',
      items: { deleteMany: {}, create: baseItems },
    },
  });
}

async function seedDemoUser(): Promise<void> {
  const passwordHash = await hashPassword('DemoLuckgage2026!');
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@luckgage.app' },
    create: {
      email: 'demo@luckgage.app',
      passwordHash,
      displayName: 'Luckgage Demo',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      locale: UserLocale.vi,
    },
    update: {
      passwordHash,
      displayName: 'Luckgage Demo',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      locale: UserLocale.vi,
    },
  });
  await prisma.authSession.deleteMany({ where: { userId: demoUser.id } });
  console.info('Shared demo account is ready.');
}

async function seedTripSuggestions(): Promise<void> {
  await prisma.tripSuggestion.upsert({
    where: { slug: 'da-lat-cuoi-tuan' },
    create: {
      slug: 'da-lat-cuoi-tuan',
      titleVi: 'Cuối tuần ở Đà Lạt',
      titleEn: 'A weekend in Da Lat',
      summaryVi: 'Gợi ý chuyến nghỉ ngắn giữa khí hậu cao nguyên mát mẻ.',
      summaryEn: 'A short highland break with a cool climate.',
      destinationLabel: 'Đà Lạt, Lâm Đồng, Việt Nam',
      latitude: 11.9404,
      longitude: 108.4583,
      destinationTimezone: 'Asia/Ho_Chi_Minh',
      countryCode: 'VN',
      adminArea: 'Lâm Đồng',
      country: 'Việt Nam',
      imageUrl: 'https://images.unsplash.com/photo-1576745515893-3042060c8d83',
      imageAltVi: 'Đồi thông trong sương ở Đà Lạt',
      imageAltEn: 'Misty pine hills in Da Lat',
      tags: ['weekend', 'highland', 'cool-weather'],
      tripType: TripType.LEISURE,
      suggestedDurationDays: 3,
      status: ContentStatus.PUBLISHED,
      sortOrder: 10,
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    update: {
      titleVi: 'Cuối tuần ở Đà Lạt',
      titleEn: 'A weekend in Da Lat',
      status: ContentStatus.PUBLISHED,
    },
  });
}
