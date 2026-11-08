import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardDto {
  @ApiProperty({ type: Number })
  totalUsers!: number;

  @ApiProperty({ type: Number })
  activeUsers!: number;

  @ApiProperty({ type: Number })
  suspendedUsers!: number;

  @ApiProperty({ type: Number })
  totalTrips!: number;

  @ApiProperty({ type: Number })
  activeTrips!: number;

  @ApiProperty({ type: Number })
  joinsLast7Days!: number;

  @ApiProperty({ type: Number })
  publishedPackingRules!: number;

  @ApiProperty({ type: Number })
  publishedTripSuggestions!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  generatedAt!: string;
}
