// src/migrations/1700000000003-CreateLoginAttemptsTable.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoginAttemptsTable1700000000003 implements MigrationInterface {
  name = 'CreateLoginAttemptsTable1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create login_attempts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "login_attempts" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) NOT NULL,
        "ipAddress" VARCHAR(45),
        "userAgent" TEXT,
        "isSuccessful" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for better performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_login_attempts_email" ON "login_attempts" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_login_attempts_ip" ON "login_attempts" ("ipAddress")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_login_attempts_created_at" ON "login_attempts" ("createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_login_attempts_email_ip" ON "login_attempts" ("email", "ipAddress")
    `);

    // Create composite index for lookup performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_login_attempts_email_ip_created" ON "login_attempts" ("email", "ipAddress", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "login_attempts"`);
  }
}