import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVendorRejectionFields1782990473679 implements MigrationInterface {
  name = 'AddVendorRejectionFields1782990473679';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add isVendorRejected column
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name = 'isVendorRejected'
        ) THEN
          ALTER TABLE "users" 
          ADD COLUMN "isVendorRejected" boolean NOT NULL DEFAULT false;
        END IF;
      END $$;
    `);

    // Add vendorRejectionReason column
    await queryRunner.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name = 'vendorRejectionReason'
        ) THEN
          ALTER TABLE "users" 
          ADD COLUMN "vendorRejectionReason" text;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "vendorRejectionReason"
    `);

    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "isVendorRejected"
    `);
  }
}