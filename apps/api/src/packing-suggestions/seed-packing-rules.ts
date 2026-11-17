import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';
import { seedCuratedPackingRules } from './packing-rule-catalog.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required.');
const databaseHost = new URL(databaseUrl).hostname;
if (
  (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(databaseHost)) &&
  process.env.ALLOW_PACKING_RULE_SEED !== 'true'
) {
  throw new Error('Remote or production catalog seed requires ALLOW_PACKING_RULE_SEED=true.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
try {
  const result = await seedCuratedPackingRules(prisma);
  console.info(`Packing rules: ${result.created} created, ${result.existing} already present.`);
} finally {
  await prisma.$disconnect();
}
