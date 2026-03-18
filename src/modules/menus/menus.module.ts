import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Menu } from './entities/menu.entity';
import { RoleMenu } from './entities/role-menu.entity';
import { MenuRepository } from './repositories/menu.repository';
import { RoleMenuRepository } from './repositories/role-menu.repository';
import { MenusService } from './menus.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Menu, RoleMenu]),
    UsersModule,
  ],
  providers: [MenusService, MenuRepository, RoleMenuRepository],
  exports: [MenusService],
})
export class MenusModule {}
