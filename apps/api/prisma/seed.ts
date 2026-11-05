import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';
import { UserLocale, UserRole, UserStatus } from '../src/generated/prisma/enums.js';
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
