import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { MembershipsController } from './memberships.controller.js';
import { TravelStatsController, TravelStatsService } from './travel-stats.controller.js';
import { AdminTripsController, TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

@Module({
  imports: [AuthModule, MembershipsModule],
  controllers: [TripsController, MembershipsController, AdminTripsController, TravelStatsController],
  providers: [TripsService, TravelStatsService],
  exports: [TripsService],
})
export class TripsModule {}
