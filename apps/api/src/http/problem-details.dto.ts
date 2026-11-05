import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProblemDetailsDto {
  @ApiProperty({ type: Number, example: 422 })
  status!: number;

  @ApiProperty({ type: String, example: 'VALIDATION_FAILED' })
  code!: string;

  @ApiProperty({ type: String, example: 'Validation failed' })
  title!: string;

  @ApiProperty({ type: String, example: 'One or more fields are invalid.' })
  detail!: string;

  @ApiProperty({ type: String, format: 'uuid' })
  requestId!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'array', items: { type: 'string' } },
    example: { name: ['name must be a string'] },
  })
  fieldErrors?: Record<string, string[]>;
}

export interface ProblemDetails extends ProblemDetailsDto {
  fieldErrors?: Record<string, string[]>;
}
