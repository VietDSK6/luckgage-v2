import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { ContentStatus } from '../generated/prisma/enums.js';

import { demoGuides, demoSuggestions, unsplashUrl } from './demo-content.js';

// Upserts the curated trip suggestions and guides by slug. Safe to re-run: it only touches these
// slugs and overwrites their text/images with the versions in demo-content.ts. It never creates
// users, trips or checklists.

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

try {
  const now = new Date();
  const suggestionIds = new Map<string, string>();

  for (const [index, item] of demoSuggestions.entries()) {
    const content = {
      titleVi: item.titleVi,
      titleEn: item.titleEn,
      summaryVi: item.summaryVi,
      summaryEn: item.summaryEn,
      destinationLabel: item.destinationLabel,
      latitude: item.latitude,
      longitude: item.longitude,
      destinationTimezone: 'Asia/Ho_Chi_Minh',
      countryCode: 'VN',
      adminArea: item.adminArea,
      country: 'Việt Nam',
      imageUrl: unsplashUrl(item.photoId),
      imageAltVi: item.imageAltVi,
      imageAltEn: item.imageAltEn,
      tags: item.tags,
      tripType: item.tripType,
      suggestedDurationDays: item.suggestedDurationDays,
      status: ContentStatus.PUBLISHED,
      sortOrder: (index + 1) * 10,
    };
    const saved = await prisma.tripSuggestion.upsert({
      where: { slug: item.slug },
      create: { slug: item.slug, ...content, publishedAt: now },
      update: content,
      select: { id: true },
    });
    suggestionIds.set(item.slug, saved.id);
  }

  for (const [index, item] of demoGuides.entries()) {
    const tripSuggestionId = item.suggestionSlug ? suggestionIds.get(item.suggestionSlug) : null;
    if (tripSuggestionId === undefined) {
      throw new Error(`Guide ${item.slug} links to unknown suggestion ${item.suggestionSlug}.`);
    }
    const content = {
      titleVi: item.titleVi,
      titleEn: item.titleEn,
      summaryVi: item.summaryVi,
      summaryEn: item.summaryEn,
      coverUrl: unsplashUrl(item.photoId),
      coverAltVi: item.coverAltVi,
      coverAltEn: item.coverAltEn,
      tags: item.tags,
      sectionsVi: item.sectionsVi,
      sectionsEn: item.sectionsEn,
      tripSuggestionId,
      status: ContentStatus.PUBLISHED,
      sortOrder: (index + 1) * 10,
    };
    await prisma.guide.upsert({
      where: { slug: item.slug },
      create: { slug: item.slug, ...content, publishedAt: now },
      update: content,
    });
  }

  console.info(`Seeded ${demoSuggestions.length} trip suggestions and ${demoGuides.length} guides.`);
} finally {
  await prisma.$disconnect();
}
