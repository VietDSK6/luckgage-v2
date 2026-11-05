import {
  HttpStatus,
  UnprocessableEntityException,
  ValidationPipe,
  type INestApplication,
  type ValidationError,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import helmet from 'helmet';

import { parseAllowedOrigins, type Environment } from './config/environment.js';
import { HttpExceptionFilter } from './http/http-exception.filter.js';

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  return errors.reduce<Record<string, string[]>>((fieldErrors, error) => {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const messages = error.constraints ? Object.values(error.constraints) : [];
    if (messages.length > 0) {
      fieldErrors[path] = messages;
    }
    Object.assign(fieldErrors, flattenValidationErrors(error.children ?? [], path));
    return fieldErrors;
  }, {});
}

export function configureApplication(app: INestApplication): OpenAPIObject {
  const config = app.get(ConfigService<Environment, true>);

  app.use(helmet());
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
      .build(),
  );
  SwaggerModule.setup('openapi', app, openApi, {
    jsonDocumentUrl: 'openapi.json',
  });

  return openApi;
}
