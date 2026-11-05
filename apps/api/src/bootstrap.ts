import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationPipe,
  type INestApplication,
  type ValidationError,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { ADMIN_SESSION_COOKIE } from './auth/admin-session.js';
import { parseAllowedOrigins, type Environment } from './config/environment.js';
import { HttpExceptionFilter } from './http/http-exception.filter.js';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Array<{ field: string; code: string; message: string }> {
  return errors.flatMap((error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownErrors = Object.entries(error.constraints ?? {}).map(([constraint, message]) => ({
      field: path,
      code: constraint.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase(),
      message,
    }));
    return [...ownErrors, ...flattenValidationErrors(error.children ?? [], path)];
  });
}

export function configureApplication(app: INestApplication): OpenAPIObject {
  const config = app.get(ConfigService<Environment, true>);

  const apiHelmet = helmet();
  const openApiHelmet = helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  });
  app.use((request: Request, response: Response, next: NextFunction) =>
    (request.path.startsWith('/openapi') ? openApiHelmet : apiHelmet)(request, response, next),
  );
  app.enableCors({
    origin: parseAllowedOrigins(config.get('ALLOWED_ORIGINS', { infer: true })),
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) =>
        new UnprocessableEntityException({
          code: 'VALIDATION_FAILED',
          title: 'Validation failed',
          detail: 'One or more fields are invalid.',
          fieldErrors: flattenValidationErrors(errors),
        }),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const openApi = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('luckgage API')
      .setDescription('Versioned REST API for luckgage mobile and admin clients.')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addCookieAuth(
        ADMIN_SESSION_COOKIE,
        { type: 'apiKey', in: 'cookie' },
        'adminSession',
      )
      .build(),
  );
  SwaggerModule.setup('openapi', app, openApi, {
    jsonDocumentUrl: 'openapi.json',
  });

  return openApi;
}
