// src/migrations/1700000000004-AddMissingIndexes.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingIndexes1700000000004 implements MigrationInterface {
  [x: string]: any;
  name = 'AddMissingIndexes1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Products - for vendor queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_owner_id_is_active" 
      ON "products" ("ownerId", "isActive")
    `);

    // Products - for category queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_category_id" 
      ON "products" ("categoryId")
    `);

    // Products - for price range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_price_stock" 
      ON "products" ("price", "stock")
    `);

    // Orders - for date range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_created_at_status" 
      ON "orders" ("createdAt", "status")
    `);

    // Reviews - for product rating calculations
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reviews_product_id_rating" 
      ON "reviews" ("productId", "rating")
    `);

    // Reviews - for user queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reviews_user_id_product_id" 
      ON "reviews" ("userId", "productId")
    `);

    // Wishlist - for user queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_wishlist_user_id_product_id" 
      ON "wishlist" ("userId", "productId")
    `);

    // Users - for search queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_name_email" 
      ON "users" ("name", "email")
    `);

    // Categories - for slug queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_categories_slug" 
      ON "categories" ("slug")
    `);

    // Categories - for parent queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_categories_parent_id" 
      ON "categories" ("parentId")
    `);

    // Refresh Tokens - for user queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id_revoked" 
      ON "refresh_tokens" ("userId", "revoked")
    `);

    // Login Attempts - for rate limiting
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_login_attempts_email_ip_created" 
      ON "login_attempts" ("email", "ipAddress", "createdAt")
    `);

    // Foreign key indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_category_id_fk" 
      ON "products" ("categoryId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_orders_user_id_fk" 
      ON "orders" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_items_order_id_fk" 
      ON "order_items" ("orderId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_order_items_product_id_fk" 
      ON "order_items" ("productId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cart_items_user_id_fk" 
      ON "cart_items" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cart_items_product_id_fk" 
      ON "cart_items" ("productId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reviews_user_id_fk" 
      ON "reviews" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reviews_product_id_fk" 
      ON "reviews" ("productId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id_fk" 
      ON "notifications" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user_id_fk" 
      ON "refresh_tokens" ("userId")
    `);

    // Partial indexes for common queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_products_active_in_stock" 
      ON "products" ("isActive", "stock") 
      WHERE stock > 0 AND "isActive" = true
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_users_verified_vendors" 
      ON "users" ("role", "isVerified", "isVendorApproved") 
      WHERE "isVerified" = true AND "isVendorApproved" = true
    `);

    this.logger?.log('All database indexes created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_owner_id_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_category_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_price_stock"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_created_at_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_product_id_rating"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_user_id_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_wishlist_user_id_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_name_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_slug"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_categories_parent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_user_id_revoked"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_login_attempts_email_ip_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_category_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_user_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_order_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_product_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cart_items_user_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cart_items_product_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_user_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_product_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_user_id_fk"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_active_in_stock"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_verified_vendors"`);
  }
}