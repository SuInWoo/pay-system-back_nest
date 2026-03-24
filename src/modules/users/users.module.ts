import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAddress } from './entities/user-address.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { RolesSeeder } from './roles.seeder';
import { UserAddressRepository } from './repositories/user-address.repository';
import { UserProfileRepository } from './repositories/user-profile.repository';
import { UserRepository } from './repositories/user.repository';
import { RoleRepository } from './repositories/role.repository';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserProfile, UserAddress])],
  providers: [
    UsersService,
    UserRepository,
    RoleRepository,
    UserProfileRepository,
    UserAddressRepository,
    RolesSeeder,
  ],
  exports: [UsersService, RoleRepository],
})
export class UsersModule {}

