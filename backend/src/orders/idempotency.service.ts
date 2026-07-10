// src/orders/idempotency.service.ts
import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { IdempotencyKey } from './idempotency-key.entity';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly TTL_MS = 300000; // 5 minutes

  constructor(
    @InjectRepository(IdempotencyKey)
    private readonly idempotencyRepo: Repository<IdempotencyKey>,
  ) {}

  async process<T>(
    key: string,
    userId: number,
    processor: () => Promise<T>,
    ttlMs: number = this.TTL_MS,
  ): Promise<T> {
    // Clean up old keys
    const cutoff = new Date(Date.now() - ttlMs);
    await this.idempotencyRepo.delete({
      createdAt: LessThan(cutoff),
    });

    // Check for existing key
    let existing = await this.idempotencyRepo.findOne({
      where: { key, userId },
    });

    if (existing) {
      if (existing.status === 'completed') {
        this.logger.debug(`Idempotency cache hit for key: ${key}`);
        return existing.response as T;
      }

      if (existing.status === 'pending') {
        const staleThreshold = new Date(Date.now() - 30000);
        if (existing.createdAt < staleThreshold) {
          this.logger.warn(`Stale pending idempotency key: ${key}, allowing retry`);
          await this.idempotencyRepo.delete({ id: existing.id });
        } else {
          throw new ConflictException('Request is already being processed');
        }
      }

      // If 'failed', allow retry
      if (existing.status === 'failed') {
        await this.idempotencyRepo.delete({ id: existing.id });
      }
    }

    // Create pending record
    const record = this.idempotencyRepo.create({
      key,
      userId,
      status: 'pending',
    });
    await this.idempotencyRepo.save(record);

    try {
      const result = await processor();

      // Update to completed
      record.status = 'completed';
      record.response = result;

      // ✅ FIX: Safely extract orderId if present
      if (result && typeof result === 'object' && 'id' in result) {
        const id = (result as any).id;
        if (typeof id === 'number') {
          record.orderId = id;
        }
      }

      record.completedAt = new Date();
      await this.idempotencyRepo.save(record);

      this.logger.debug(`Idempotency processing completed for key: ${key}`);
      return result;
    } catch (error) {
      // Mark as failed
      record.status = 'failed';
      await this.idempotencyRepo.save(record);
      this.logger.error(`Idempotency processing failed for key: ${key}`, error);
      throw error;
    }
  }

  async isProcessed(key: string, userId: number): Promise<boolean> {
    const record = await this.idempotencyRepo.findOne({
      where: { key, userId, status: 'completed' },
    });
    return !!record;
  }

  async getCachedResponse<T>(key: string, userId: number): Promise<T | null> {
    const record = await this.idempotencyRepo.findOne({
      where: { key, userId, status: 'completed' },
    });
    return record?.response || null;
  }

  async cleanupExpiredKeys(ttlMs: number = this.TTL_MS): Promise<number> {
    const cutoff = new Date(Date.now() - ttlMs);
    const result = await this.idempotencyRepo.delete({
      createdAt: LessThan(cutoff),
    });
    this.logger.log(`Cleaned up ${result.affected} expired idempotency keys`);
    return result.affected || 0;
  }
}