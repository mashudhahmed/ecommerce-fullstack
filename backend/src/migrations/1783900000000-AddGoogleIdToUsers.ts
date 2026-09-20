import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleIdToUsers1783900000000 implements MigrationInterface {
  name = 'AddGoogleIdToUsers1783900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "googleId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_users_googleId" ON "users" ("googleId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_googleId"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "googleId"`,
    );
  }
}
