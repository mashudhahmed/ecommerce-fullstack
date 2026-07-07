// src/common/crons/cleanup.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class CleanupCron {
  private readonly logger = new Logger(CleanupCron.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // Run every hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTokens() {
    this.logger.log('🧹 Cleaning up expired tokens...');
    
    try {
      // Clean expired refresh tokens
      const refreshResult = await this.dataSource.query(`
        DELETE FROM refresh_tokens 
        WHERE expires_at < NOW() OR revoked = true
      `);
      
      // Clean expired blacklisted tokens
      const blacklistResult = await this.dataSource.query(`
        DELETE FROM token_blacklist 
        WHERE expires_at < NOW()
      `);

      // Clean expired verification codes
      const verificationResult = await this.dataSource.query(`
        UPDATE users 
        SET verification_code = NULL, 
            verification_code_expiry = NULL 
        WHERE verification_code_expiry < NOW()
      `);

      // Clean expired reset codes
      const resetResult = await this.dataSource.query(`
        UPDATE users 
        SET reset_code = NULL, 
            reset_code_expiry = NULL 
        WHERE reset_code_expiry < NOW()
      `);

      // Clean expired reset tokens
      const resetTokenResult = await this.dataSource.query(`
        UPDATE users 
        SET reset_token_hash = NULL, 
            reset_token_expiry = NULL 
        WHERE reset_token_expiry < NOW()
      `);

      // Clean old login attempts (older than 30 days)
      const loginAttemptResult = await this.dataSource.query(`
        DELETE FROM login_attempts 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);

      // Clean expired cart items (older than 7 days)
      const cartResult = await this.dataSource.query(`
        DELETE FROM cart_items 
        WHERE expires_at IS NOT NULL 
        AND expires_at < NOW()
      `);

      this.logger.log(
        `✅ Cleanup completed: ` +
        `${refreshResult[0]?.count || 0} refresh tokens, ` +
        `${blacklistResult[0]?.count || 0} blacklisted tokens, ` +
        `${verificationResult[0]?.count || 0} verification codes, ` +
        `${resetResult[0]?.count || 0} reset codes, ` +
        `${resetTokenResult[0]?.count || 0} reset tokens, ` +
        `${loginAttemptResult[0]?.count || 0} login attempts, ` +
        `${cartResult[0]?.count || 0} cart items cleaned`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to clean up expired items:', errorMessage);
    }
  }

  // Run daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupSoftDeletedUsers() {
    this.logger.log('🧹 Cleaning up soft-deleted users older than 30 days...');
    
    try {
      const result = await this.dataSource.query(`
        DELETE FROM users 
        WHERE deleted_at IS NOT NULL 
        AND deleted_at < NOW() - INTERVAL '30 days'
      `);

      this.logger.log(`✅ Permanently deleted ${result[0]?.count || 0} old soft-deleted users`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to clean up soft-deleted users:', errorMessage);
    }
  }

  // Run every 15 minutes to purge expired sessions
  @Cron('*/15 * * * *')
  async cleanupExpiredSessions() {
    this.logger.log('🧹 Cleaning up expired sessions...');
    
    try {
      const result = await this.dataSource.query(`
        DELETE FROM session 
        WHERE expired_at < NOW()
      `);

      this.logger.log(`✅ ${result[0]?.count || 0} expired sessions cleaned`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to clean up expired sessions:', errorMessage);
    }
  }

  // Run daily at 2 AM to cleanup orphaned records
  @Cron('0 2 * * *')
  async cleanupOrphanedRecords() {
    this.logger.log('🧹 Cleaning up orphaned records...');
    
    try {
      // Clean orphaned order items (orders that don't exist)
      const orderItemsResult = await this.dataSource.query(`
        DELETE FROM order_items 
        WHERE "orderId" IS NULL 
        OR NOT EXISTS (SELECT 1 FROM orders WHERE id = order_items."orderId")
      `);

      // Clean orphaned cart items (users that don't exist)
      const cartItemsResult = await this.dataSource.query(`
        DELETE FROM cart_items 
        WHERE "userId" IS NULL 
        OR NOT EXISTS (SELECT 1 FROM users WHERE id = cart_items."userId")
      `);

      // Clean orphaned products (users that don't exist)
      const productsResult = await this.dataSource.query(`
        UPDATE products 
        SET "ownerId" = NULL 
        WHERE "ownerId" IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM users WHERE id = products."ownerId")
      `);

      this.logger.log(
        `✅ Orphaned records cleaned: ` +
        `${orderItemsResult[0]?.count || 0} order items, ` +
        `${cartItemsResult[0]?.count || 0} cart items, ` +
        `${productsResult[0]?.count || 0} products updated`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to clean up orphaned records:', errorMessage);
    }
  }

  // Run every Sunday at 3 AM to cleanup old logs
  @Cron('0 3 * * 0')
  async cleanupOldLogs() {
    this.logger.log('🧹 Cleaning up old logs...');
    
    try {
      // Clean login attempts older than 90 days
      const loginAttemptResult = await this.dataSource.query(`
        DELETE FROM login_attempts 
        WHERE created_at < NOW() - INTERVAL '90 days'
      `);

      // Clean refresh tokens older than 90 days (even if not expired)
      const refreshResult = await this.dataSource.query(`
        DELETE FROM refresh_tokens 
        WHERE created_at < NOW() - INTERVAL '90 days'
      `);

      this.logger.log(
        `✅ Old logs cleaned: ` +
        `${loginAttemptResult[0]?.count || 0} login attempts, ` +
        `${refreshResult[0]?.count || 0} refresh tokens`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to clean up old logs:', errorMessage);
    }
  }
}