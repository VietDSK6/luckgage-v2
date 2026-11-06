import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import {
  AdminTripSuggestionsController,
  TripSuggestionsController,
} from './trip-suggestions.controller.js';
import { TripSuggestionsService } from './trip-suggestions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TripSuggestionsController, AdminTripSuggestionsController],
  providers: [TripSuggestionsService],
})
export class TripSuggestionsModule {}
