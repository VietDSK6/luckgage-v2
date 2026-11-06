import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { WeatherModule } from '../weather/weather.module.js';
import {
  AdminPackingRulesController,
  PackingSuggestionsController,
} from './packing.controller.js';
import { PackingRulesService } from './packing-rules.service.js';
import { PackingSuggestionsService } from './packing-suggestions.service.js';

@Module({
  imports: [AuthModule, MembershipsModule, WeatherModule],
  controllers: [PackingSuggestionsController, AdminPackingRulesController],
  providers: [PackingRulesService, PackingSuggestionsService],
})
export class PackingModule {}
