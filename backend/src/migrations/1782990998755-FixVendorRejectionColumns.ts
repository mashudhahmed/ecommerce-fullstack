import { MigrationInterface, QueryRunner } from "typeorm";

export class FixVendorRejectionColumns1782990998755 implements MigrationInterface {
    name = 'FixVendorRejectionColumns1782990998755'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "token_blacklist" DROP COLUMN "userAgent"`);
        await queryRunner.query(`ALTER TABLE "token_blacklist" DROP COLUMN "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "token_blacklist" DROP COLUMN "tokenType"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "isVendorRejected" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "vendorRejectionReason" text`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying(100) NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'vendor', 'admin', 'superadmin')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "vendorBusinessDescription"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "vendorBusinessDescription" text`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "vendorAddress"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "vendorAddress" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "vendorAddress"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "vendorAddress" character varying`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "vendorBusinessDescription"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "vendorBusinessDescription" character varying`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum_old" AS ENUM('user', 'vendor', 'admin', 'superadmin', 'SUPERADMIN')`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "vendorRejectionReason"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isVendorRejected"`);
        await queryRunner.query(`ALTER TABLE "token_blacklist" ADD "tokenType" character varying(20) DEFAULT 'access_token'`);
        await queryRunner.query(`ALTER TABLE "token_blacklist" ADD "ipAddress" character varying(45)`);
        await queryRunner.query(`ALTER TABLE "token_blacklist" ADD "userAgent" character varying(100)`);
    }

}
