import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

import type { ProblemDetails } from './problem-details.dto.js';
import type { RequestWithContext } from './request-context.js';

type ExceptionBody = {
  code?: unknown;
  title?: unknown;
  detail?: unknown;
  message?: unknown;
  fieldErrors?: unknown;
};

const STATUS_DEFAULTS: Record<number, { code: string; title: string }> = {
  [HttpStatus.BAD_REQUEST]: { code: 'BAD_REQUEST', title: 'Bad request' },
  [HttpStatus.UNAUTHORIZED]: { code: 'UNAUTHORIZED', title: 'Unauthorized' },
  [HttpStatus.FORBIDDEN]: { code: 'FORBIDDEN', title: 'Forbidden' },
  [HttpStatus.NOT_FOUND]: { code: 'NOT_FOUND', title: 'Not found' },
  [HttpStatus.CONFLICT]: { code: 'CONFLICT', title: 'Conflict' },
  [HttpStatus.UNPROCESSABLE_ENTITY]: {
    code: 'VALIDATION_FAILED',
    title: 'Validation failed',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: { code: 'RATE_LIMITED', title: 'Too many requests' },
  [HttpStatus.SERVICE_UNAVAILABLE]: {
    code: 'SERVICE_UNAVAILABLE',
    title: 'Service unavailable',
  },
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = this.getExceptionBody(exception);
    const fallback = STATUS_DEFAULTS[status] ?? {
      code: 'INTERNAL_ERROR',
      title: 'Internal server error',
    };
    const requestId = request.requestId ?? 'unavailable';
    const problem: ProblemDetails = {
      status,
      code: typeof body.code === 'string' ? body.code : fallback.code,
      title: typeof body.title === 'string' ? body.title : fallback.title,
      detail: this.resolveDetail(status, body),
      requestId,
    };

    if (this.isFieldErrors(body.fieldErrors)) {
      problem.fieldErrors = body.fieldErrors;
    }

    if (status >= 500) {
      this.logger.error({
        event: 'http_request_failed',
        requestId,
        method: request.method,
        route: request.originalUrl,
        statusCode: status,
        error: exception instanceof Error ? exception.stack : String(exception),
      });
    }

    response.status(status).json(problem);
  }

  private getExceptionBody(exception: unknown): ExceptionBody {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const response = exception.getResponse();
    return typeof response === 'object' && response !== null
      ? response
      : { message: response };
  }

  private resolveDetail(status: number, body: ExceptionBody): string {
    if (status >= 500) {
      return 'The server could not complete the request.';
    }
    if (typeof body.detail === 'string') {
      return body.detail;
    }
    if (typeof body.message === 'string') {
      return body.message;
    }
    return 'The request could not be completed.';
  }

  private isFieldErrors(
    value: unknown,
  ): value is Array<{ field: string; code: string; message: string }> {
    return (
      Array.isArray(value) &&
      value.every(
        (fieldError) =>
          typeof fieldError === 'object' &&
          fieldError !== null &&
          typeof Reflect.get(fieldError, 'field') === 'string' &&
          typeof Reflect.get(fieldError, 'code') === 'string' &&
          typeof Reflect.get(fieldError, 'message') === 'string',
      )
    );
  }
}
