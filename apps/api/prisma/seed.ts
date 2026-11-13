import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  ContentStatus,
  QuantityMode,
  TripMemberRole,
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
const databaseHost = new URL(databaseUrl).hostname;
if (
  (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(databaseHost)) &&
  process.env.ALLOW_DEMO_SEED !== 'true'
) {
  throw new Error('Demo seed on production or remote databases requires ALLOW_DEMO_SEED=true.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

try {
  await prisma.$queryRaw`SELECT 1`;
  await seedPackingRules();
  await seedTripSuggestions();
  await seedGuide();
  const demoUserId = await seedDemoUser();
  await seedDemoJourney(demoUserId);
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
      name: 'Đồ dùng thiết yếu cơ bản',
      version: 1,
      priority: 10,
      status: ContentStatus.PUBLISHED,
      reasonVi: 'Đồ thiết yếu cho mọi chuyến đi',
      reasonEn: 'Essentials for every trip',
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      items: { create: baseItems },
    },
    update: {
      name: 'Đồ dùng thiết yếu cơ bản',
      priority: 10,
      status: ContentStatus.PUBLISHED,
      reasonVi: 'Đồ thiết yếu cho mọi chuyến đi',
      reasonEn: 'Essentials for every trip',
      items: { deleteMany: {}, create: baseItems },
    },
  });
}

async function seedDemoUser(): Promise<string> {
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
  return demoUser.id;
}

async function seedDemoJourney(ownerId: string): Promise<void> {
  const secondUser = await prisma.user.upsert({
    where: { email: 'demo2@luckgage.app' },
    create: {
      email: 'demo2@luckgage.app',
      passwordHash: await hashPassword('DemoLuckgage2026!'),
      displayName: 'Luckgage Companion',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      locale: UserLocale.vi,
    },
    update: {},
  });
  const startDate = new Date();
  startDate.setUTCHours(0, 0, 0, 0);
  startDate.setUTCDate(startDate.getUTCDate() + 7);
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 2);
  const existing = await prisma.trip.findFirst({
    where: { name: 'Đà Lạt · Demo', members: { some: { userId: ownerId, role: TripMemberRole.OWNER } } },
    select: { id: true },
  });
  const trip = existing
    ? await prisma.trip.update({ where: { id: existing.id }, data: { startDate, endDate }, select: { id: true } })
    : await prisma.trip.create({
        data: {
          name: 'Đà Lạt · Demo',
          destinationLabel: 'Đà Lạt, Lâm Đồng, Việt Nam',
          latitude: 11.9404,
          longitude: 108.4583,
          destinationTimezone: 'Asia/Ho_Chi_Minh',
          countryCode: 'VN',
          startDate,
          endDate,
          tripType: TripType.LEISURE,
        },
        select: { id: true },
      });
  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: trip.id, userId: ownerId } },
    create: { tripId: trip.id, userId: ownerId, role: TripMemberRole.OWNER },
    update: { removedAt: null, role: TripMemberRole.OWNER },
  });
  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: trip.id, userId: secondUser.id } },
    create: { tripId: trip.id, userId: secondUser.id, role: TripMemberRole.MEMBER },
    update: { removedAt: null, role: TripMemberRole.MEMBER },
  });
  const category = await prisma.checklistCategory.findFirst({
    where: { tripId: trip.id, name: 'Đồ thiết yếu' },
    select: { id: true },
  }) ?? await prisma.checklistCategory.create({
    data: { tripId: trip.id, name: 'Đồ thiết yếu', position: 0 },
    select: { id: true },
  });
  for (const [position, name] of ['Giấy tờ tùy thân', 'Áo khoác nhẹ', 'Sạc điện thoại'].entries()) {
    const item = await prisma.checklistItem.findFirst({ where: { categoryId: category.id, name }, select: { id: true } });
    if (!item) await prisma.checklistItem.create({ data: { categoryId: category.id, name, position, createdByUserId: ownerId } });
  }
  console.info('Two-user demo trip and checklist are ready.');
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

async function seedGuide(): Promise<void> {
  const suggestion = await prisma.tripSuggestion.findUniqueOrThrow({
    where: { slug: 'da-lat-cuoi-tuan' },
    select: { id: true },
  });
  await prisma.guide.upsert({
    where: { slug: 'chuan-bi-cho-da-lat' },
    create: {
      slug: 'chuan-bi-cho-da-lat',
      titleVi: 'Chuẩn bị cho Đà Lạt',
      titleEn: 'Packing for Da Lat',
      summaryVi: 'Những món cần kiểm tra trước chuyến đi cao nguyên.',
      summaryEn: 'What to check before a highland trip.',
      coverUrl: 'https://images.unsplash.com/photo-1576745515893-3042060c8d83',
      coverAltVi: 'Đồi thông trong sương ở Đà Lạt',
      coverAltEn: 'Misty pine hills in Da Lat',
      tags: ['da-lat', 'packing'],
      sectionsVi: [
        { type: 'heading', text: 'Trang phục theo lớp' },
        { type: 'paragraph', text: 'Buổi sáng và tối có thể mát hơn ban ngày. Mang áo khoác nhẹ và một lớp áo dễ cởi.' },
        { type: 'bulletList', items: ['Áo khoác nhẹ', 'Giày đi bộ thoải mái', 'Áo mưa gọn'] },
        { type: 'callout', text: 'Kiểm tra dự báo gần ngày đi để điều chỉnh hành lý.' },
      ],
      sectionsEn: [
        { type: 'heading', text: 'Dress in layers' },
        { type: 'paragraph', text: 'Mornings and evenings can be cooler than afternoons. Bring a light jacket and an easy-to-remove layer.' },
        { type: 'bulletList', items: ['Light jacket', 'Comfortable walking shoes', 'Compact rain jacket'] },
        { type: 'callout', text: 'Check the forecast close to departure and adjust your bag.' },
      ],
      tripSuggestionId: suggestion.id,
      status: ContentStatus.PUBLISHED,
      sortOrder: 10,
      publishedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    update: { status: ContentStatus.PUBLISHED, tripSuggestionId: suggestion.id },
  });
}
