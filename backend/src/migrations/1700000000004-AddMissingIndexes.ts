// src/migrations/1700000000004-AddMissingIndexes.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingIndexes1700000000004 implements MigrationInterface {
  [x: string]: any;
  name = 'AddMissingIndexes1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ✅ Products - for vendor queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_owner_id_is_active" 
      ON "products" ("ownerId", "isActive")
    `);

    // ✅ Products - for category queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_category_id" 
      ON "products" ("categoryId")
    `);

    // ✅ Products - for price range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_price_stock" 
      ON "products" ("price", "stock")
    `);

    // ✅ Orders - for vendor queries (via order items)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_items_product_id" 
      ON "order_items" ("productId")
    `);

    // ✅ Orders - for date range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_created_at_status" 
      ON "orders" ("createdAt", "status")
    `);

    // ✅ Orders - for user queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_user_id_status" 
      ON "orders" ("userId", "status")
    `);

    // ✅ Reviews - for product rating calculations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reviews_product_id_rating" 
      ON "reviews" ("productId", "rating")
    `);

    // ✅ Reviews - for user queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reviews_user_id_product_id" 
      ON "reviews" ("userId", "productId")
    `);

    // ✅ Cart - for user queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cart_items_user_id_product_id" 
      ON "cart_items" ("userId", "productId")
    `);

    // ✅ Wishlist - for user queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wishlist_user_id_product_id" 
      ON "wishlist" ("userId", "productId")
    `);

    // ✅ Users - for role and verification queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_role_is_verified" 
      ON "users" ("role", "isVerified")
    `);

    // ✅ Users - for vendor approval queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_is_vendor_approved" 
      ON "users" ("isVendorApproved")
    `);

    // ✅ Users - for search queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_name_email" 
      ON "users" ("name", "email")
    `);

    // ✅ Categories - for slug queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_categories_slug" 
      ON "categories" ("slug")
    `);

    // ✅ Categories - for parent queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_categories_parent_id" 
      ON "categories" ("parentId")
    `);

    // ✅ Refresh Tokens - for cleanup
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_expires_at" 
      ON "refresh_tokens" ("expiresAt")
    `);

    // ✅ Refresh Tokens - for user queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id_revoked" 
      ON "refresh_tokens" ("userId", "revoked")
    `);

    // ✅ Login Attempts - for rate limiting
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_login_attempts_email_ip_created" 
      ON "login_attempts" ("email", "ipAddress", "createdAt")
    `);

    this.logger?.log('✅ All database indexes created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_owner_id_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_category_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_price_stock"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_created_at_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_user_id_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_product_id_rating"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_user_id_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cart_items_user_id_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wishlist_user_id_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_role_is_verified"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_is_vendor_approved"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_name_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_parent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_user_id_revoked"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_login_attempts_email_ip_created"`);
  }
}