import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDatabaseIndexes1700000000000 implements MigrationInterface {
  name = 'AddDatabaseIndexes1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users table indexes
    // NOTE: no namingStrategy is configured anywhere in this project (see
    // app.module.ts's TypeOrmModule.forRootAsync and database/data-source.ts),
    // so TypeORM defaults every column to the exact camelCase property name
    // from the entity — never snake_case. Confirmed directly against
    // user.entity.ts, order.entity.ts, products.entity.ts, cart-item.entity.ts,
    // and the "isVendorRejected"/"vendorRejectionReason" columns seen in the
    // actual synchronize log output earlier in this conversation.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
      CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
      CREATE INDEX IF NOT EXISTS "idx_users_is_verified" ON "users" ("isVerified");
      CREATE INDEX IF NOT EXISTS "idx_users_is_vendor_approved" ON "users" ("isVendorApproved");
      CREATE INDEX IF NOT EXISTS "idx_users_created_at" ON "users" ("createdAt");
      CREATE INDEX IF NOT EXISTS "idx_users_deleted_at" ON "users" ("deletedAt");
    `);

    // Products table indexes
    // owner_id -> ownerId (FK column generated from the `owner` ManyToOne relation)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_owner_id" ON "products" ("ownerId");
      CREATE INDEX IF NOT EXISTS "idx_products_is_active" ON "products" ("isActive");
      CREATE INDEX IF NOT EXISTS "idx_products_stock" ON "products" ("stock");
      CREATE INDEX IF NOT EXISTS "idx_products_price" ON "products" ("price");
      CREATE INDEX IF NOT EXISTS "idx_products_created_at" ON "products" ("createdAt");
      CREATE INDEX IF NOT EXISTS "idx_products_title" ON "products" ("title");
    `);

    // Orders table indexes
    // user_id -> userId (FK column generated from the `user` ManyToOne relation)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_user_id" ON "orders" ("userId");
      CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status");
      CREATE INDEX IF NOT EXISTS "idx_orders_created_at" ON "orders" ("createdAt");
      CREATE INDEX IF NOT EXISTS "idx_orders_total" ON "orders" ("total");
    `);

    // Order Items table indexes
    // INFERRED, not directly confirmed against order-item.entity.ts — verify
    // orderId/productId match that file's actual relation property names
    // before running this migration.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items" ("orderId");
      CREATE INDEX IF NOT EXISTS "idx_order_items_product_id" ON "order_items" ("productId");
    `);

    // Cart Items table indexes
    // Confirmed against cart-item.entity.ts: `user` and `product` ManyToOne
    // relations -> userId / productId FK columns.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cart_items_user_id" ON "cart_items" ("userId");
      CREATE INDEX IF NOT EXISTS "idx_cart_items_product_id" ON "cart_items" ("productId");
    `);

    // Refresh Tokens table indexes
    // INFERRED from auth.service.ts's refreshTokenRepo.create({ tokenHash,
    // userId, expiresAt, ... }) and stored.revoked — not directly confirmed
    // against refresh-token.entity.ts. Verify before running.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id" ON "refresh_tokens" ("userId");
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_token_hash" ON "refresh_tokens" ("tokenHash");
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" ON "refresh_tokens" ("expiresAt");
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_revoked" ON "refresh_tokens" ("revoked");
    `);

    // Token Blacklist table indexes
    // NOTE: token.entity.ts already has @Index() directly on token, expiresAt,
    // and userId, so TypeORM auto-generates its own indexes on these columns.
    // These CREATE INDEX statements are redundant (harmless, just duplicate
    // index overhead on writes) — consider removing this block entirely
    // rather than fixing the column names, since the indexes already exist.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_token_blacklist_token" ON "token_blacklist" ("token");
      CREATE INDEX IF NOT EXISTS "idx_token_blacklist_expires_at" ON "token_blacklist" ("expiresAt");
      CREATE INDEX IF NOT EXISTS "idx_token_blacklist_user_id" ON "token_blacklist" ("userId");
    `);

    // Composite indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_user_status" ON "orders" ("userId", "status");
      CREATE INDEX IF NOT EXISTS "idx_products_owner_active" ON "products" ("ownerId", "isActive");
      CREATE INDEX IF NOT EXISTS "idx_users_role_verified" ON "users" ("role", "isVerified");
      CREATE INDEX IF NOT EXISTS "idx_cart_user_product" ON "cart_items" ("userId", "productId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_user_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_owner_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_role_verified"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cart_user_product"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_is_verified"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_is_vendor_approved"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_deleted_at"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_owner_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_stock"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_price"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_title"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_total"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_product_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cart_items_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cart_items_product_id"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_token_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_revoked"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_blacklist_token"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_blacklist_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_token_blacklist_user_id"`);
  }
}