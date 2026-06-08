import { Global, Module } from '@nestjs/common';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [],
  exports: [TypeOrmModule],
})
export class SharedModule {}
