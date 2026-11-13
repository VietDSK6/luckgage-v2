import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { WeatherClient } from './weather.client.js';
import { AdminLocationsController, WeatherController } from './weather.controller.js';
import { WeatherService } from './weather.service.js';

@Module({
  imports: [AuthModule, MembershipsModule],
  controllers: [WeatherController, AdminLocationsController],
  providers: [WeatherClient, WeatherService],
  exports: [WeatherClient, WeatherService],
})
export class WeatherModule {}
