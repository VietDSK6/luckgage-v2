import { ApiProperty } from '@nestjs/swagger';

export class LivenessDto {
  @ApiProperty({ type: String, example: 'up' })
  status!: 'up';

  @ApiProperty({ type: String, example: 'luckgage-api' })
  service!: string;
}

export class ReadinessDto extends LivenessDto {
  @ApiProperty({ type: Object, example: { database: 'up', migrations: 'up' } })
  checks!: {
    database: 'up';
    migrations: 'up';
  };
}
