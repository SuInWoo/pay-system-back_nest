import { Module } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MenusModule } from '../menus/menus.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, UsersModule, MenusModule],
  controllers: [AdminController],
  providers: [RolesGuard],
})
export class AdminModule {}
