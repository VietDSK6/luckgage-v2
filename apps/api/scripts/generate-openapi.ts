import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NestFactory } from '@nestjs/core';

process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://luckgage:luckgage_local@localhost:5433/luckgage';

const { AppModule } = await import('../src/app.module.js');
const { configureApplication } = await import('../src/bootstrap.js');

const app = await NestFactory.create(AppModule, { abortOnError: false, logger: false });
const document = configureApplication(app);
const output = `${JSON.stringify(document, null, 2)}\n`;
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(currentDirectory, '../openapi/openapi.json');

if (process.argv.includes('--check')) {
  const existing = await readFile(outputPath, 'utf8').catch(() => '');
  if (existing !== output) {
    console.error('OpenAPI artifact is missing or stale. Run npm run openapi:generate.');
    process.exitCode = 1;
  }
} else {
  await writeFile(outputPath, output, 'utf8');
  console.info(`Wrote ${outputPath}`);
}

await app.close();
