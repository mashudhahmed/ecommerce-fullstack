// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer, RequestMethod, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CartModule } from './cart/cart.module';
import { AdminModule } from './admin/admin.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { MailerModule } from './mailer/mailer.module';
import { HealthModule } from './health/health.module';
import { CategoriesModule } from './categories/categories.module';
import { SearchModule } from './search/search.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { VendorModule } from './vendor/vendor.module';
import { ExportModule } from './analytics/export.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FilesModule } from './files/files.module';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { DatabaseSeederService } from './database/database-seeder.service';
import { CleanupCron } from './common/crons/cleanup.cron';
import { Category } from './categories/category.entity';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.config';
import { CacheModule } from './common/cache/cache.module';
import { User } from './user/user.entity';
import { Product } from './products/products.entity';
import { SampleDataSeeder } from './database/sample-data.seeder';
import { WishlistModule } from './wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('rateLimit.ttl', 60000),
          limit: configService.get<number>('rateLimit.max', 100),
        },
      ],
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        autoLoadEntities: true,
        entities: [Category],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        ssl: configService.get('database.ssl') || false,
        extra: {
          max: configService.get('database.maxConnections', 20),
          idleTimeoutMillis: configService.get('database.idleTimeout', 30000),
          connectionTimeoutMillis: configService.get('database.connectionTimeout', 2000),
        },
        retryAttempts: 5,
        retryDelay: 3000,
      }),
      inject: [ConfigService],
    }),
    // ✅ Register repositories for the seeders
    TypeOrmModule.forFeature([User, Category, Product]),
    AuthModule,
    UserModule,
    ProductsModule,
    OrdersModule,
    CartModule,
    AdminModule,
    SuperadminModule,
    MailerModule,
    HealthModule,
    CategoriesModule,
    // SearchModule,
    AnalyticsModule,
    VendorModule,
    ExportModule,
    ReviewsModule,
    FilesModule,
    CacheModule,
    WishlistModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseSeederService,
    CleanupCron,
    SampleDataSeeder,   // ✅ Added
  ],
})
export class AppModule implements NestModule, OnApplicationBootstrap {
  constructor(private readonly databaseSeeder: DatabaseSeederService) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }

  async onApplicationBootstrap() {
    if (process.env.NODE_ENV !== 'production') {
      await this.databaseSeeder.runSeeders();
    }
  }
}