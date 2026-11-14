import { readFile } from 'node:fs/promises';

import { PrismaPg } from '@prisma/adapter-pg';

import { hashPassword } from '../auth/password.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { UserLocale, UserRole, UserStatus } from '../generated/prisma/enums.js';

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const passwordFile = process.env.ADMIN_BOOTSTRAP_PASSWORD_FILE;

if (!databaseUrl || !email || !passwordFile) {
  throw new Error('DATABASE_URL, ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD_FILE are required.');
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email address.');
}

const password = (await readFile(passwordFile, 'utf8')).replace(/[\r\n]+$/, '');
if (password.length < 10 || password.length > 128) {
  throw new Error('Admin password must contain between 10 and 128 characters.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      throw new Error('That email already belongs to a non-admin account.');
    }
    console.info('Admin already exists; credentials were not changed.');
  } else {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        displayName: 'Luckgage Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        locale: UserLocale.vi,
      },
    });
    console.info('Admin account created.');
  }
} finally {
  await prisma.$disconnect();
}
