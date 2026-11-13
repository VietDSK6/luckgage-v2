import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminGuidesController, GuidesController } from './guides.controller.js';
import { GuidesService } from './guides.service.js';

@Module({ imports: [AuthModule], controllers: [GuidesController, AdminGuidesController], providers: [GuidesService] })
export class GuidesModule {}
