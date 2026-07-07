// src/migrations/1782994302572-CreateCategoriesTable.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategoriesTable1782994302572 implements MigrationInterface {
    name = 'CreateCategoriesTable1782994302572'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ✅ Check if categories table already exists
        const tableExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_name = 'categories'
            )
        `);

        if (tableExists[0].exists) {
            console.log('ℹ️ Categories table already exists, skipping creation');
            await this.createOtherTables(queryRunner);
            return;
        }

        // Categories Table
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "slug" character varying, "description" text, "imageUrl" character varying, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "parentId" integer, CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);

        await this.createOtherTables(queryRunner);
        await this.addConstraints(queryRunner);
    }

    private async createOtherTables(queryRunner: QueryRunner): Promise<void> {
        // Wishlist
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "wishlist" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "productId" integer, CONSTRAINT "PK_620bff4a240d66c357b5d820eaa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_2ca6e3d0bd9835eabd2668d515" ON "wishlist" ("userId", "productId") `);

        // Reviews
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "reviews" ("id" SERIAL NOT NULL, "rating" integer NOT NULL, "comment" text NOT NULL, "title" text, "images" jsonb, "metadata" jsonb, "isApproved" boolean NOT NULL DEFAULT false, "isDeleted" boolean NOT NULL DEFAULT false, "approvedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer, "productId" integer, CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_9007ffba411fd471dfe233dabf" ON "reviews" ("productId", "userId") `);

        // Shipping Types
        const shippingMethodEnumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM pg_type 
                WHERE typname = 'shipping_method_enum'
            )
        `);
        if (!shippingMethodEnumExists[0].exists) {
            await queryRunner.query(`CREATE TYPE "public"."shipping_method_enum" AS ENUM('standard', 'express', 'overnight', 'same_day', 'free', 'international')`);
        }

        const shippingStatusEnumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM pg_type 
                WHERE typname = 'shipping_status_enum'
            )
        `);
        if (!shippingStatusEnumExists[0].exists) {
            await queryRunner.query(`CREATE TYPE "public"."shipping_status_enum" AS ENUM('pending', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')`);
        }

        // Shipping
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "shipping" ("id" SERIAL NOT NULL, "method" "public"."shipping_method_enum" NOT NULL DEFAULT 'standard', "cost" numeric(10,2) NOT NULL, "status" "public"."shipping_status_enum" NOT NULL DEFAULT 'pending', "trackingNumber" character varying, "carrier" character varying, "address" jsonb, "estimatedDelivery" TIMESTAMP, "shippedAt" TIMESTAMP, "deliveredAt" TIMESTAMP, "trackingHistory" jsonb, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orderId" integer, CONSTRAINT "PK_0dc6ac92ee9cbc2c1611d77804c" PRIMARY KEY ("id"))`);

        // Returns Types
        const returnsReasonEnumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM pg_type 
                WHERE typname = 'returns_reason_enum'
            )
        `);
        if (!returnsReasonEnumExists[0].exists) {
            await queryRunner.query(`CREATE TYPE "public"."returns_reason_enum" AS ENUM('defective', 'wrong_item', 'damaged', 'not_as_described', 'change_of_mind', 'other')`);
        }

        const returnsStatusEnumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM pg_type 
                WHERE typname = 'returns_status_enum'
            )
        `);
        if (!returnsStatusEnumExists[0].exists) {
            await queryRunner.query(`CREATE TYPE "public"."returns_status_enum" AS ENUM('pending', 'approved', 'rejected', 'shipped', 'received', 'refunded', 'completed')`);
        }

        // Returns
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "returns" ("id" SERIAL NOT NULL, "items" jsonb NOT NULL, "reason" "public"."returns_reason_enum" NOT NULL, "description" text NOT NULL, "images" jsonb, "status" "public"."returns_status_enum" NOT NULL DEFAULT 'pending', "refundAmount" numeric(10,2), "refundTransactionId" character varying, "adminNotes" text, "rejectionReason" text, "approvedAt" TIMESTAMP, "refundedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orderId" integer, "userId" integer, CONSTRAINT "PK_27a2f1895a71519ebfec7850361" PRIMARY KEY ("id"))`);

        // Coupons Types
        const couponsDiscountTypeEnumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM pg_type 
                WHERE typname = 'coupons_discounttype_enum'
            )
        `);
        if (!couponsDiscountTypeEnumExists[0].exists) {
            await queryRunner.query(`CREATE TYPE "public"."coupons_discounttype_enum" AS ENUM('percentage', 'fixed', 'free_shipping')`);
        }

        const couponsStatusEnumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM pg_type 
                WHERE typname = 'coupons_status_enum'
            )
        `);
        if (!couponsStatusEnumExists[0].exists) {
            await queryRunner.query(`CREATE TYPE "public"."coupons_status_enum" AS ENUM('active', 'expired', 'used', 'disabled')`);
        }

        // Coupons
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "coupons" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "name" character varying NOT NULL, "description" text, "discountType" "public"."coupons_discounttype_enum" NOT NULL DEFAULT 'percentage', "discountValue" numeric(10,2) NOT NULL, "maxDiscount" numeric(10,2), "minOrderAmount" numeric(10,2), "validFrom" TIMESTAMP NOT NULL, "validUntil" TIMESTAMP NOT NULL, "usageLimit" integer NOT NULL DEFAULT '0', "usedCount" integer NOT NULL DEFAULT '0', "perUserLimit" integer NOT NULL DEFAULT '0', "status" "public"."coupons_status_enum" NOT NULL DEFAULT 'active', "isFirstOrderOnly" boolean NOT NULL DEFAULT false, "metadata" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e025109230e82925843f2a14c48" UNIQUE ("code"), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_e025109230e82925843f2a14c4" ON "coupons" ("code") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_6de1c6664fd0fa3018bb5facb0" ON "coupons" ("validFrom") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_2f4cbebb7ffad130bab9944e28" ON "coupons" ("validUntil") `);

        // Coupon Relations
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "coupon_users" ("couponsId" integer NOT NULL, "usersId" integer NOT NULL, CONSTRAINT "PK_c89d4cc4ad320d6aa806852b3b7" PRIMARY KEY ("couponsId", "usersId"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c781f0a6472247a1c3be708380" ON "coupon_users" ("couponsId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_a15def9a9cd08e70e3e6cc9fd8" ON "coupon_users" ("usersId") `);
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "coupon_products" ("couponsId" integer NOT NULL, "productsId" integer NOT NULL, CONSTRAINT "PK_6f96daddf80851582be7fa08b46" PRIMARY KEY ("couponsId", "productsId"))`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_c05afaad3161a29c5c0cce9664" ON "coupon_products" ("couponsId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_70a38d5642ce21bfa125db0dea" ON "coupon_products" ("productsId") `);

        // Token Blacklist
        await queryRunner.query(`ALTER TABLE "token_blacklist" DROP COLUMN IF EXISTS "userAgent"`);
        await queryRunner.query(`ALTER TABLE "token_blacklist" DROP COLUMN IF EXISTS "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "token_blacklist" DROP COLUMN IF EXISTS "tokenType"`);

        // Products
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "averageRating" numeric(3,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "totalReviews" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "categoryId" integer`);

        // ✅ FIX: Handle users name column correctly
        const columnExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'name'
            )
        `);

        if (columnExists[0].exists) {
            // Column exists, ensure NOT NULL and update nulls
            await queryRunner.query(`UPDATE "users" SET "name" = COALESCE("name", split_part(email, '@', 1)) WHERE "name" IS NULL`);
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`);
        } else {
            // Column does not exist, create it safely
            await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying(100)`);
            await queryRunner.query(`UPDATE "users" SET "name" = split_part(email, '@', 1) WHERE "name" IS NULL`);
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`);
        }

        // Role enum
        const roleEnumExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM pg_type 
                WHERE typname = 'users_role_enum'
            )
        `);

        if (roleEnumExists[0].exists) {
            await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
            await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'vendor', 'admin', 'superadmin')`);
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`);
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`);
            await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
        }

        // Vendor rejection columns
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "isVendorRejected" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "vendorBusinessDescription"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "vendorBusinessDescription" text`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "vendorAddress"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "vendorAddress" text`);
    }

    private async addConstraints(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT IF NOT EXISTS "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT IF NOT EXISTS "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wishlist" ADD CONSTRAINT IF NOT EXISTS "FK_f6eeb74a295e2aad03b76b0ba87" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "wishlist" ADD CONSTRAINT IF NOT EXISTS "FK_17e00e49d77ccaf7ff0e14de37b" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT IF NOT EXISTS "FK_7ed5659e7139fc8bc039198cc1f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT IF NOT EXISTS "FK_a6b3c434392f5d10ec171043666" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "shipping" ADD CONSTRAINT IF NOT EXISTS "FK_ca6a07e6f19abf7a0f2fadf62eb" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "returns" ADD CONSTRAINT IF NOT EXISTS "FK_b3851bc6d0e2a7ddc7412806a0f" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "returns" ADD CONSTRAINT IF NOT EXISTS "FK_2cbd012253b843a98634386723d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "coupon_users" ADD CONSTRAINT IF NOT EXISTS "FK_c781f0a6472247a1c3be708380a" FOREIGN KEY ("couponsId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "coupon_users" ADD CONSTRAINT IF NOT EXISTS "FK_a15def9a9cd08e70e3e6cc9fd8b" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "coupon_products" ADD CONSTRAINT IF NOT EXISTS "FK_c05afaad3161a29c5c0cce96648" FOREIGN KEY ("couponsId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "coupon_products" ADD CONSTRAINT IF NOT EXISTS "FK_70a38d5642ce21bfa125db0dea4" FOREIGN KEY ("productsId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "coupon_products" DROP CONSTRAINT IF EXISTS "FK_70a38d5642ce21bfa125db0dea4"`);
        await queryRunner.query(`ALTER TABLE "coupon_products" DROP CONSTRAINT IF EXISTS "FK_c05afaad3161a29c5c0cce96648"`);
        await queryRunner.query(`ALTER TABLE "coupon_users" DROP CONSTRAINT IF EXISTS "FK_a15def9a9cd08e70e3e6cc9fd8b"`);
        await queryRunner.query(`ALTER TABLE "coupon_users" DROP CONSTRAINT IF EXISTS "FK_c781f0a6472247a1c3be708380a"`);
        await queryRunner.query(`ALTER TABLE "returns" DROP CONSTRAINT IF EXISTS "FK_2cbd012253b843a98634386723d"`);
        await queryRunner.query(`ALTER TABLE "returns" DROP CONSTRAINT IF EXISTS "FK_b3851bc6d0e2a7ddc7412806a0f"`);
        await queryRunner.query(`ALTER TABLE "shipping" DROP CONSTRAINT IF EXISTS "FK_ca6a07e6f19abf7a0f2fadf62eb"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_a6b3c434392f5d10ec171043666"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_7ed5659e7139fc8bc039198cc1f"`);
        await queryRunner.query(`ALTER TABLE "wishlist" DROP CONSTRAINT IF EXISTS "FK_17e00e49d77ccaf7ff0e14de37b"`);
        await queryRunner.query(`ALTER TABLE "wishlist" DROP CONSTRAINT IF EXISTS "FK_f6eeb74a295e2aad03b76b0ba87"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_9a6f051e66982b5f0318981bcaa"`);

        // Drop tables (reverse order of creation)
        await queryRunner.query(`DROP TABLE IF EXISTS "coupon_products"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "coupon_users"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "coupons"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "returns"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "shipping"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "wishlist"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "categories"`);

        // Drop enum types
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."coupons_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."coupons_discounttype_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."returns_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."returns_reason_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."shipping_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."shipping_method_enum"`);

        // Revert user column changes
        // Note: We won't drop the "name" column as it may be needed; we just revert the NOT NULL constraint if possible
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL`);

        // Revert role enum to old version (if it was changed)
        // This is complex; we'll skip detailed rollback of enum to avoid errors

        // Revert vendor rejection columns (optional)
        // Not necessary to drop them as they are new columns
    }
}