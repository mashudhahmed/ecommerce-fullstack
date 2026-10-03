import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVendorWalletsAndPayouts1784100000000
  implements MigrationInterface
{
  name = 'CreateVendorWalletsAndPayouts1784100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create vendor_wallets table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_wallets" (
        "id" SERIAL NOT NULL,
        "vendorId" integer NOT NULL,
        "availableBalance" numeric(12,2) NOT NULL DEFAULT '0',
        "escrowBalance" numeric(12,2) NOT NULL DEFAULT '0',
        "totalEarned" numeric(12,2) NOT NULL DEFAULT '0',
        "totalWithdrawn" numeric(12,2) NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_vendor_wallets_vendorId" UNIQUE ("vendorId"),
        CONSTRAINT "PK_vendor_wallets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_wallets_vendorId" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vendor_wallets_vendorId" ON "vendor_wallets" ("vendorId")
    `);

    // 2. Create vendor_payouts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_payouts" (
        "id" SERIAL NOT NULL,
        "vendorId" integer NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "paymentMethod" character varying NOT NULL DEFAULT 'Bank Transfer',
        "accountDetails" text NOT NULL,
        "adminNotes" text,
        "transactionReference" character varying,
        "processedAt" TIMESTAMP,
        "processedById" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vendor_payouts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_payouts_vendorId" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vendor_payouts_processedById" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vendor_payouts_vendorId_status" ON "vendor_payouts" ("vendorId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vendor_payouts_vendorId_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_payouts"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vendor_wallets_vendorId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_wallets"`);
  }
}
