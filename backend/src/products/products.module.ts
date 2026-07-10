// src/products/products.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './products.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './product.controller';
import { UserModule } from '../user/user.module';
// CacheModule, MonitoringModule, EventsModule are global - no need to import

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    UserModule,
    // CacheModule is @Global()
    // MonitoringModule is @Global()
    // EventsModule is @Global()
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}