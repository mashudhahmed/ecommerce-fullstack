import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTwoFactorTempFields1783651140621 implements MigrationInterface {
    name = 'AddTwoFactorTempFields1783651140621'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ============================================================
        // DROP EXISTING CONSTRAINTS (IF EXISTS is supported for DROP)
        // ============================================================
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_parent"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_product_category"`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP CONSTRAINT IF EXISTS "two_factor_userId_fkey"`);

        // ============================================================
        // DROP EXISTING INDEXES (IF EXISTS is supported for DROP)
        // ============================================================
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_categories_slug"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_categories_parentId"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_categories_parent_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_products_owner_id_is_active"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_products_category_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_products_price_stock"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_order_items_product_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_orders_created_at_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_orders_user_id_status"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_users_role_is_verified"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_users_is_vendor_approved"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_users_name_email"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_wishlist_user_id_product_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_reviews_product_id_rating"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_reviews_user_id_product_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_idempotency_keys_key_user"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_idempotency_keys_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_cart_items_user_id_product_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_two_factor_userid"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_refresh_tokens_expires_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_refresh_tokens_user_id_revoked"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_login_attempts_email"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_login_attempts_ip"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_login_attempts_created_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_login_attempts_email_ip"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_login_attempts_email_ip_created"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_user_rate_limits_user_endpoint"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_user_rate_limits_expires"`);

        // ============================================================
        // CREATE NEW TABLES (IF NOT EXISTS is supported for CREATE TABLE)
        // ============================================================
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "user_preferences" (
                "id" SERIAL NOT NULL, 
                "emailNotifications" boolean NOT NULL DEFAULT false, 
                "smsNotifications" boolean NOT NULL DEFAULT false, 
                "language" character varying NOT NULL DEFAULT 'en', 
                "theme" character varying NOT NULL DEFAULT 'light', 
                "metadata" jsonb, 
                "userId" integer, 
                CONSTRAINT "REL_b6202d1cacc63a0b9c8dac2abd" UNIQUE ("userId"), 
                CONSTRAINT "PK_e8cfb5b31af61cd363a6b6d7c25" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "product_variants" (
                "id" SERIAL NOT NULL, 
                "sku" character varying NOT NULL, 
                "price" numeric(10,2) NOT NULL, 
                "stock" integer NOT NULL, 
                "attributes" jsonb NOT NULL, 
                "imageUrl" character varying, 
                "productId" integer, 
                CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "product_images" (
                "id" SERIAL NOT NULL, 
                "url" character varying NOT NULL, 
                "isPrimary" boolean NOT NULL DEFAULT false, 
                "sortOrder" integer NOT NULL DEFAULT '0', 
                "altText" character varying, 
                "productId" integer, 
                CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "order_timeline" (
                "id" SERIAL NOT NULL, 
                "orderId" integer NOT NULL, 
                "action" character varying NOT NULL, 
                "metadata" jsonb, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                "userId" integer, 
                CONSTRAINT "PK_e6c8ff4a57760022bbf838d2a73" PRIMARY KEY ("id")
            )
        `);

        // ============================================================
        // CREATE NOTIFICATIONS TABLE
        // ============================================================
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_type_enum') THEN
                    CREATE TYPE "public"."notifications_type_enum" AS ENUM(
                        'order_confirmation', 
                        'order_shipped', 
                        'order_delivered', 
                        'order_cancelled', 
                        'payment_success', 
                        'payment_failed', 
                        'welcome', 
                        'password_reset', 
                        'email_verification', 
                        'promotional', 
                        'vendor_approved', 
                        'vendor_rejected', 
                        'vendor_suspended', 
                        'vendor_activated'
                    );
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notifications_channel_enum') THEN
                    CREATE TYPE "public"."notifications_channel_enum" AS ENUM(
                        'email', 
                        'sms', 
                        'push', 
                        'in_app'
                    );
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "notifications" (
                "id" SERIAL NOT NULL, 
                "userId" integer NOT NULL, 
                "type" "public"."notifications_type_enum" NOT NULL, 
                "channel" "public"."notifications_channel_enum" NOT NULL, 
                "title" character varying NOT NULL, 
                "content" text NOT NULL, 
                "data" jsonb, 
                "read" boolean NOT NULL DEFAULT false, 
                "readAt" TIMESTAMP, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_21e65af2f4f242d4c85a92aff4" ON "notifications" ("userId", "createdAt") 
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_d60c47e715847c8aa792ba6d1e" ON "notifications" ("userId", "read") 
        `);

        // ============================================================
        // CREATE SESSIONS TABLE
        // ============================================================
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "sessions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), 
                "userId" integer NOT NULL, 
                "isActive" boolean NOT NULL DEFAULT true, 
                "userAgent" character varying, 
                "ipAddress" character varying, 
                "expiresAt" TIMESTAMP NOT NULL, 
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(), 
                CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_07bd9c0d345c7e1110981e3431" ON "sessions" ("userId", "isActive") 
        `);

        // ============================================================
        // ALTER ORDERS TABLE - ADD CANCELLATION FIELDS (IF NOT EXISTS is supported for ADD COLUMN)
        // ============================================================
        await queryRunner.query(`
            ALTER TABLE "orders" 
            ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" 
            ADD COLUMN IF NOT EXISTS "cancellationReason" character varying
        `);
        await queryRunner.query(`
            ALTER TABLE "orders" 
            ADD COLUMN IF NOT EXISTS "cancelledById" integer
        `);

        // ============================================================
        // ALTER TWO_FACTOR TABLE - ADD TEMP CODE FIELDS (MAIN FIX)
        // ============================================================
        await queryRunner.query(`
            ALTER TABLE "two_factor" 
            ADD COLUMN IF NOT EXISTS "tempCode" character varying(10)
        `);
        await queryRunner.query(`
            ALTER TABLE "two_factor" 
            ADD COLUMN IF NOT EXISTS "tempCodeExpiry" TIMESTAMP
        `);

        // ============================================================
        // ALTER CATEGORIES TABLE - SET NOT NULL
        // ============================================================
        await queryRunner.query(`
            ALTER TABLE "categories" 
            ALTER COLUMN "sortOrder" SET NOT NULL,
            ALTER COLUMN "isActive" SET NOT NULL,
            ALTER COLUMN "createdAt" SET NOT NULL,
            ALTER COLUMN "updatedAt" SET NOT NULL
        `);

        // ============================================================
        // ALTER PRODUCTS TABLE - SET NOT NULL
        // ============================================================
        await queryRunner.query(`
            ALTER TABLE "products" 
            ALTER COLUMN "averageRating" SET NOT NULL,
            ALTER COLUMN "totalReviews" SET NOT NULL
        `);

        // ============================================================
        // ✅ FIX: HANDLE USERS NAME COLUMN - SAFELY
        // ============================================================
        // Step 1: Check if name column exists
        const nameColumnExists = await queryRunner.query(`
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND column_name = 'name'
            )
        `);

        if (nameColumnExists[0].exists) {
            // Step 2: Update any null names with email username
            await queryRunner.query(`
                UPDATE "users" 
                SET "name" = COALESCE("name", split_part(email, '@', 1)) 
                WHERE "name" IS NULL
            `);

            // Step 3: Drop and recreate name column safely
            await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
            await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying(100)`);
            
            // Step 4: Update any remaining null names
            await queryRunner.query(`
                UPDATE "users" 
                SET "name" = COALESCE("name", split_part(email, '@', 1)) 
                WHERE "name" IS NULL
            `);
            
            // Step 5: Set NOT NULL constraint
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`);
        } else {
            // Column doesn't exist, create it
            await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying(100)`);
            await queryRunner.query(`
                UPDATE "users" 
                SET "name" = split_part(email, '@', 1) 
                WHERE "name" IS NULL
            `);
            await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL`);
        }

        // ============================================================
        // ALTER TWO_FACTOR TABLE - COMPLETE
        // ============================================================
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "secret"`);
        await queryRunner.query(`ALTER TABLE "two_factor" ADD "secret" text`);
        await queryRunner.query(`ALTER TABLE "two_factor" ALTER COLUMN "isEnabled" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "method"`);
        
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'two_factor_method_enum') THEN
                    CREATE TYPE "public"."two_factor_method_enum" AS ENUM('authenticator', 'sms', 'email');
                END IF;
            END $$;
        `);
        
        await queryRunner.query(`
            ALTER TABLE "two_factor" 
            ADD "method" "public"."two_factor_method_enum" NOT NULL DEFAULT 'email'
        `);
        
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "phoneNumber"`);
        await queryRunner.query(`ALTER TABLE "two_factor" ADD "phoneNumber" character varying`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "email"`);
        await queryRunner.query(`ALTER TABLE "two_factor" ADD "email" character varying`);
        await queryRunner.query(`ALTER TABLE "two_factor" ALTER COLUMN "createdAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "two_factor" ALTER COLUMN "updatedAt" SET NOT NULL`);

        // ============================================================
        // ALTER LOGIN_ATTEMPTS TABLE
        // ============================================================
        await queryRunner.query(`ALTER TABLE "login_attempts" DROP COLUMN IF EXISTS "email"`);
        await queryRunner.query(`ALTER TABLE "login_attempts" ADD "email" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "login_attempts" DROP COLUMN IF EXISTS "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "login_attempts" ADD "ipAddress" character varying`);
        await queryRunner.query(`ALTER TABLE "login_attempts" DROP COLUMN IF EXISTS "userAgent"`);
        await queryRunner.query(`ALTER TABLE "login_attempts" ADD "userAgent" character varying`);

        // ============================================================
        // CREATE NEW INDEXES
        // ============================================================
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_9c0cd5f4363be416d112d6ce68" ON "idempotency_keys" ("key", "userId") 
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_46dd77d64eb0ed0d65383ac4ed" ON "login_attempts" ("email", "createdAt") 
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_f010492bf9360983ee65d1c09f" ON "login_attempts" ("email", "ipAddress") 
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_41327c1e087376cfefad3c82be" ON "user_rate_limits" ("userId", "endpoint") 
        `);

        // ============================================================
        // ✅ FIX: ADD FOREIGN KEY CONSTRAINTS (NO "IF NOT EXISTS")
        // ============================================================
        // First check if constraint exists, then add it
        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_9a6f051e66982b5f0318981bcaa' 
                    AND table_name = 'categories'
                ) THEN
                    ALTER TABLE "categories" 
                    ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" 
                    FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_ff56834e735fa78a15d0cf21926' 
                    AND table_name = 'products'
                ) THEN
                    ALTER TABLE "products" 
                    ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" 
                    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_303fee34b638662ba4d05392fa5' 
                    AND table_name = 'orders'
                ) THEN
                    ALTER TABLE "orders" 
                    ADD CONSTRAINT "FK_303fee34b638662ba4d05392fa5" 
                    FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_f6eeb74a295e2aad03b76b0ba87' 
                    AND table_name = 'wishlist'
                ) THEN
                    ALTER TABLE "wishlist" 
                    ADD CONSTRAINT "FK_f6eeb74a295e2aad03b76b0ba87" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_17e00e49d77ccaf7ff0e14de37b' 
                    AND table_name = 'wishlist'
                ) THEN
                    ALTER TABLE "wishlist" 
                    ADD CONSTRAINT "FK_17e00e49d77ccaf7ff0e14de37b" 
                    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_b6202d1cacc63a0b9c8dac2abd4' 
                    AND table_name = 'user_preferences'
                ) THEN
                    ALTER TABLE "user_preferences" 
                    ADD CONSTRAINT "FK_b6202d1cacc63a0b9c8dac2abd4" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_ca6a07e6f19abf7a0f2fadf62eb' 
                    AND table_name = 'shipping'
                ) THEN
                    ALTER TABLE "shipping" 
                    ADD CONSTRAINT "FK_ca6a07e6f19abf7a0f2fadf62eb" 
                    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_7ed5659e7139fc8bc039198cc1f' 
                    AND table_name = 'reviews'
                ) THEN
                    ALTER TABLE "reviews" 
                    ADD CONSTRAINT "FK_7ed5659e7139fc8bc039198cc1f" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_a6b3c434392f5d10ec171043666' 
                    AND table_name = 'reviews'
                ) THEN
                    ALTER TABLE "reviews" 
                    ADD CONSTRAINT "FK_a6b3c434392f5d10ec171043666" 
                    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_b3851bc6d0e2a7ddc7412806a0f' 
                    AND table_name = 'returns'
                ) THEN
                    ALTER TABLE "returns" 
                    ADD CONSTRAINT "FK_b3851bc6d0e2a7ddc7412806a0f" 
                    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_2cbd012253b843a98634386723d' 
                    AND table_name = 'returns'
                ) THEN
                    ALTER TABLE "returns" 
                    ADD CONSTRAINT "FK_2cbd012253b843a98634386723d" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_f515690c571a03400a9876600b5' 
                    AND table_name = 'product_variants'
                ) THEN
                    ALTER TABLE "product_variants" 
                    ADD CONSTRAINT "FK_f515690c571a03400a9876600b5" 
                    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_b367708bf720c8dd62fc6833161' 
                    AND table_name = 'product_images'
                ) THEN
                    ALTER TABLE "product_images" 
                    ADD CONSTRAINT "FK_b367708bf720c8dd62fc6833161" 
                    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_93d97b3f29475b1db090a8451db' 
                    AND table_name = 'order_timeline'
                ) THEN
                    ALTER TABLE "order_timeline" 
                    ADD CONSTRAINT "FK_93d97b3f29475b1db090a8451db" 
                    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_494c7b50570f8f46d8a81ab2c32' 
                    AND table_name = 'order_timeline'
                ) THEN
                    ALTER TABLE "order_timeline" 
                    ADD CONSTRAINT "FK_494c7b50570f8f46d8a81ab2c32" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_692a909ee0fa9383e7859f9b406' 
                    AND table_name = 'notifications'
                ) THEN
                    ALTER TABLE "notifications" 
                    ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_d288854a558678a066860bd30e0' 
                    AND table_name = 'two_factor'
                ) THEN
                    ALTER TABLE "two_factor" 
                    ADD CONSTRAINT "FK_d288854a558678a066860bd30e0" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_57de40bc620f456c7311aa3a1e6' 
                    AND table_name = 'sessions'
                ) THEN
                    ALTER TABLE "sessions" 
                    ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" 
                    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_c781f0a6472247a1c3be708380a' 
                    AND table_name = 'coupon_users'
                ) THEN
                    ALTER TABLE "coupon_users" 
                    ADD CONSTRAINT "FK_c781f0a6472247a1c3be708380a" 
                    FOREIGN KEY ("couponsId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_a15def9a9cd08e70e3e6cc9fd8b' 
                    AND table_name = 'coupon_users'
                ) THEN
                    ALTER TABLE "coupon_users" 
                    ADD CONSTRAINT "FK_a15def9a9cd08e70e3e6cc9fd8b" 
                    FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_c05afaad3161a29c5c0cce96648' 
                    AND table_name = 'coupon_products'
                ) THEN
                    ALTER TABLE "coupon_products" 
                    ADD CONSTRAINT "FK_c05afaad3161a29c5c0cce96648" 
                    FOREIGN KEY ("couponsId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'FK_70a38d5642ce21bfa125db0dea4' 
                    AND table_name = 'coupon_products'
                ) THEN
                    ALTER TABLE "coupon_products" 
                    ADD CONSTRAINT "FK_70a38d5642ce21bfa125db0dea4" 
                    FOREIGN KEY ("productsId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // ============================================================
        // DROP FOREIGN KEY CONSTRAINTS
        // ============================================================
        await queryRunner.query(`ALTER TABLE "coupon_products" DROP CONSTRAINT IF EXISTS "FK_70a38d5642ce21bfa125db0dea4"`);
        await queryRunner.query(`ALTER TABLE "coupon_products" DROP CONSTRAINT IF EXISTS "FK_c05afaad3161a29c5c0cce96648"`);
        await queryRunner.query(`ALTER TABLE "coupon_users" DROP CONSTRAINT IF EXISTS "FK_a15def9a9cd08e70e3e6cc9fd8b"`);
        await queryRunner.query(`ALTER TABLE "coupon_users" DROP CONSTRAINT IF EXISTS "FK_c781f0a6472247a1c3be708380a"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP CONSTRAINT IF EXISTS "FK_d288854a558678a066860bd30e0"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "order_timeline" DROP CONSTRAINT IF EXISTS "FK_494c7b50570f8f46d8a81ab2c32"`);
        await queryRunner.query(`ALTER TABLE "order_timeline" DROP CONSTRAINT IF EXISTS "FK_93d97b3f29475b1db090a8451db"`);
        await queryRunner.query(`ALTER TABLE "product_images" DROP CONSTRAINT IF EXISTS "FK_b367708bf720c8dd62fc6833161"`);
        await queryRunner.query(`ALTER TABLE "product_variants" DROP CONSTRAINT IF EXISTS "FK_f515690c571a03400a9876600b5"`);
        await queryRunner.query(`ALTER TABLE "returns" DROP CONSTRAINT IF EXISTS "FK_2cbd012253b843a98634386723d"`);
        await queryRunner.query(`ALTER TABLE "returns" DROP CONSTRAINT IF EXISTS "FK_b3851bc6d0e2a7ddc7412806a0f"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_a6b3c434392f5d10ec171043666"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_7ed5659e7139fc8bc039198cc1f"`);
        await queryRunner.query(`ALTER TABLE "shipping" DROP CONSTRAINT IF EXISTS "FK_ca6a07e6f19abf7a0f2fadf62eb"`);
        await queryRunner.query(`ALTER TABLE "user_preferences" DROP CONSTRAINT IF EXISTS "FK_b6202d1cacc63a0b9c8dac2abd4"`);
        await queryRunner.query(`ALTER TABLE "wishlist" DROP CONSTRAINT IF EXISTS "FK_17e00e49d77ccaf7ff0e14de37b"`);
        await queryRunner.query(`ALTER TABLE "wishlist" DROP CONSTRAINT IF EXISTS "FK_f6eeb74a295e2aad03b76b0ba87"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_303fee34b638662ba4d05392fa5"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_9a6f051e66982b5f0318981bcaa"`);

        // ============================================================
        // DROP INDEXES
        // ============================================================
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_41327c1e087376cfefad3c82be"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_f010492bf9360983ee65d1c09f"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_46dd77d64eb0ed0d65383ac4ed"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_9c0cd5f4363be416d112d6ce68"`);

        // ============================================================
        // REVERT LOGIN_ATTEMPTS
        // ============================================================
        await queryRunner.query(`ALTER TABLE "login_attempts" DROP COLUMN IF EXISTS "userAgent"`);
        await queryRunner.query(`ALTER TABLE "login_attempts" ADD "userAgent" text`);
        await queryRunner.query(`ALTER TABLE "login_attempts" DROP COLUMN IF EXISTS "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "login_attempts" ADD "ipAddress" character varying(45)`);
        await queryRunner.query(`ALTER TABLE "login_attempts" DROP COLUMN IF EXISTS "email"`);
        await queryRunner.query(`ALTER TABLE "login_attempts" ADD "email" character varying(255) NOT NULL`);

        // ============================================================
        // REVERT TWO_FACTOR
        // ============================================================
        await queryRunner.query(`ALTER TABLE "two_factor" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "two_factor" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "email"`);
        await queryRunner.query(`ALTER TABLE "two_factor" ADD "email" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "phoneNumber"`);
        await queryRunner.query(`ALTER TABLE "two_factor" ADD "phoneNumber" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "method"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."two_factor_method_enum"`);
        await queryRunner.query(`ALTER TABLE "two_factor" ADD "method" character varying(50) DEFAULT 'authenticator'`);
        await queryRunner.query(`ALTER TABLE "two_factor" ALTER COLUMN "isEnabled" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "secret"`);
        await queryRunner.query(`ALTER TABLE "two_factor" ADD "secret" character varying(255)`);

        // ============================================================
        // REVERT USERS NAME
        // ============================================================
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying`);

        // ============================================================
        // REVERT PRODUCTS
        // ============================================================
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "totalReviews" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "averageRating" DROP NOT NULL`);

        // ============================================================
        // REVERT CATEGORIES
        // ============================================================
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "createdAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "isActive" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "sortOrder" DROP NOT NULL`);

        // ============================================================
        // REVERT TWO_FACTOR TEMP COLUMNS
        // ============================================================
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "tempCodeExpiry"`);
        await queryRunner.query(`ALTER TABLE "two_factor" DROP COLUMN IF EXISTS "tempCode"`);

        // ============================================================
        // REVERT ORDERS CANCELLATION FIELDS
        // ============================================================
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "cancelledById"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "cancellationReason"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "cancelledAt"`);

        // ============================================================
        // DROP NEW TABLES
        // ============================================================
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_07bd9c0d345c7e1110981e3431"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sessions"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d60c47e715847c8aa792ba6d1e"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_21e65af2f4f242d4c85a92aff4"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."notifications_channel_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "order_timeline"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "product_images"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "product_variants"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences"`);

        // ============================================================
        // REVERT INDEXES
        // ============================================================
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_rate_limits_expires" ON "user_rate_limits" ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_user_rate_limits_user_endpoint" ON "user_rate_limits" ("endpoint", "userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_login_attempts_email_ip_created" ON "login_attempts" ("createdAt", "email", "ipAddress") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_login_attempts_email_ip" ON "login_attempts" ("email", "ipAddress") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_login_attempts_created_at" ON "login_attempts" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_login_attempts_ip" ON "login_attempts" ("ipAddress") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_login_attempts_email" ON "login_attempts" ("email") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id_revoked" ON "refresh_tokens" ("revoked", "userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "refresh_tokens" ("expiresAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_two_factor_userid" ON "two_factor" ("userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cart_items_user_id_product_id" ON "cart_items" ("productId", "userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_idempotency_keys_created" ON "idempotency_keys" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_idempotency_keys_key_user" ON "idempotency_keys" ("key", "userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_user_id_product_id" ON "reviews" ("productId", "userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_product_id_rating" ON "reviews" ("productId", "rating") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_wishlist_user_id_product_id" ON "wishlist" ("productId", "userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_name_email" ON "users" ("email", "name") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_is_vendor_approved" ON "users" ("isVendorApproved") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_users_role_is_verified" ON "users" ("isVerified", "role") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_user_id_status" ON "orders" ("status", "userId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_created_at_status" ON "orders" ("createdAt", "status") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_order_items_product_id" ON "order_items" ("productId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_price_stock" ON "products" ("price", "stock") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_category_id" ON "products" ("categoryId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_products_owner_id_is_active" ON "products" ("isActive", "ownerId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_categories_parent_id" ON "categories" ("parentId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_categories_parentId" ON "categories" ("parentId") `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_categories_slug" ON "categories" ("slug") `);

        // ============================================================
        // REVERT FOREIGN KEY CONSTRAINTS
        // ============================================================
        await queryRunner.query(`
            ALTER TABLE "two_factor" 
            ADD CONSTRAINT IF NOT EXISTS "two_factor_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "products" 
            ADD CONSTRAINT IF NOT EXISTS "FK_product_category" 
            FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "categories" 
            ADD CONSTRAINT IF NOT EXISTS "FK_parent" 
            FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION
        `);
    }
}