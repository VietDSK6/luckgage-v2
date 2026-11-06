import { Module } from '@nestjs/common';

import { InvitesService } from './invites.service.js';
import { MembershipsService } from './memberships.service.js';

@Module({
  providers: [MembershipsService, InvitesService],
  exports: [MembershipsService, InvitesService],
})
export class MembershipsModule {}
