import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVendorOrdersTable1784000000000
  implements MigrationInterface
{
  name = 'CreateVendorOrdersTable1784000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add partially_shipped to orders_status_enum if it exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_status_enum') THEN
          BEGIN
            ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'partially_shipped';
          EXCEPTION
            WHEN duplicate_object THEN null;
          END;
        END IF;
      END$$;
    `);

    // 2. Create vendor_orders table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vendor_orders" (
        "id" SERIAL NOT NULL,
        "orderId" integer NOT NULL,
        "vendorId" integer NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "subtotal" numeric(12,2) NOT NULL DEFAULT '0',
        "shippingFee" numeric(10,2) NOT NULL DEFAULT '0',
        "commissionRate" numeric(5,2) NOT NULL DEFAULT '10',
        "commissionAmount" numeric(12,2) NOT NULL DEFAULT '0',
        "vendorEarnings" numeric(12,2) NOT NULL DEFAULT '0',
        "carrierName" character varying,
        "trackingNumber" character varying,
        "trackingUrl" character varying,
        "estimatedDeliveryDate" TIMESTAMP,
        "shippedAt" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "cancelledAt" TIMESTAMP,
        "cancellationReason" character varying,
        "payoutStatus" character varying NOT NULL DEFAULT 'escrow',
        "notes" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vendor_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_vendor_orders_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_vendor_orders_vendorId" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // 3. Create indexes for quick seller lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vendor_orders_vendorId_status" ON "vendor_orders" ("vendorId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_vendor_orders_orderId" ON "vendor_orders" ("orderId")
    `);

    // 4. Add vendorOrderId to order_items
    await queryRunner.query(`
      ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "vendorOrderId" integer
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_order_items_vendorOrderId'
        ) THEN
          ALTER TABLE "order_items" 
          ADD CONSTRAINT "FK_order_items_vendorOrderId" 
          FOREIGN KEY ("vendorOrderId") REFERENCES "vendor_orders"("id") ON DELETE CASCADE;
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_vendorOrderId"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_items" DROP COLUMN IF EXISTS "vendorOrderId"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_vendor_orders_orderId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_vendor_orders_vendorId_status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "vendor_orders"`);
  }
}
