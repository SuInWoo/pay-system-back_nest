import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientCompany } from './entities/client-company.entity';
import { Product } from './entities/product.entity';
import { MasterController } from './master.controller';
import { MasterService } from './master.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientCompany, Product])],
  controllers: [MasterController],
  providers: [MasterService],
  exports: [MasterService],
})
export class MasterModule {}

