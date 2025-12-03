import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Module } from "@nestjs/common";
import { CartModule } from "./cart/cart.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { OrdersModule } from "./orders/orders.module";
import { AdminModule } from "./admin/admin.module";
import { SuperadminModule } from "./super admin/superadmin.module";
import { ProductsModule } from "./products/products.module";
import { MailerModule } from "./mailer/mailer.module";
import { DatabaseSeederService } from "./database/database-seeder.service"; // ✅ NEW

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT ?? '5434', 10),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),

    AuthModule,
    CartModule,
    UserModule, // This now provides SuperAdminSeeder
    OrdersModule,
    AdminModule,
    SuperadminModule,
    ProductsModule,
    MailerModule,
  ],
  providers: [DatabaseSeederService], // ✅ NEW - handles auto-seeding
})
export class AppModule {}