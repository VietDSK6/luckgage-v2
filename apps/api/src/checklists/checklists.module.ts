import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { ChecklistsController } from './checklists.controller.js';
import { ChecklistsService } from './checklists.service.js';

@Module({
  imports: [AuthModule, MembershipsModule],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
})
export class ChecklistsModule {}
