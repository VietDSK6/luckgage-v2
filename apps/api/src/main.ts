import { ConsoleLogger, Logger, type LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { configureApplication } from './bootstrap.js';
import type { Environment } from './config/environment.js';

const LOG_LEVELS: Record<Environment['LOG_LEVEL'], LogLevel[]> = {
  fatal: ['fatal'],
  error: ['fatal', 'error'],
  warn: ['fatal', 'error', 'warn'],
  info: ['fatal', 'error', 'warn', 'log'],
  debug: ['fatal', 'error', 'warn', 'log', 'debug'],
};
const configuredLogLevel =
  process.env.LOG_LEVEL && process.env.LOG_LEVEL in LOG_LEVELS
    ? (process.env.LOG_LEVEL as Environment['LOG_LEVEL'])
    : 'info';

const app = await NestFactory.create(AppModule, {
  bufferLogs: true,
  logger: new ConsoleLogger({
    json: process.env.NODE_ENV === 'production',
    logLevels: LOG_LEVELS[configuredLogLevel],
  }),
});
app.flushLogs();
configureApplication(app);
app.enableShutdownHooks();

const config = app.get(ConfigService<Environment, true>);
const port = config.get('PORT', { infer: true });
await app.listen(port, '0.0.0.0');

new Logger('Bootstrap').log({
  event: 'api_started',
  port,
  environment: config.get('NODE_ENV', { infer: true }),
});
