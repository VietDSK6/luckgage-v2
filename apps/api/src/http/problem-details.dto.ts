import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidationFieldErrorDto {
  @ApiProperty({ type: String, example: 'email' })
  field!: string;

  @ApiProperty({ type: String, example: 'IS_EMAIL' })
  code!: string;

  @ApiProperty({ type: String, example: 'email must be an email' })
  message!: string;
}

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
    type: () => [ValidationFieldErrorDto],
  })
  fieldErrors?: ValidationFieldErrorDto[];
}

export interface ProblemDetails extends ProblemDetailsDto {
  fieldErrors?: ValidationFieldErrorDto[];
}
