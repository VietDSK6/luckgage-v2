import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AdminUsersController, MeController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MeController, AdminUsersController],
  providers: [UsersService],
})
export class UsersModule {}
