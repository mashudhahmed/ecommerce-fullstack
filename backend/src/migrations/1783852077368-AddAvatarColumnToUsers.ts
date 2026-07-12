import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarColumnToUsers1783852077368 implements MigrationInterface {
    name = 'AddAvatarColumnToUsers1783852077368'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "compareAtPrice" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "products" ADD "sku" character varying`);
        await queryRunner.query(`ALTER TABLE "products" ADD "isTrending" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "products" ADD "isNew" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "products" ADD "additionalImages" jsonb`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar" character varying`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "categoryId" SET NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" RENAME TO "notifications_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('order_confirmation', 'order_updated', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_success', 'payment_failed', 'welcome', 'password_reset', 'email_verification', 'promotional', 'vendor_approved', 'vendor_rejected', 'vendor_suspended', 'vendor_activated')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum" USING "type"::"text"::"public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_32cd206985f4311552152d81c2" ON "products" ("categoryId", "isActive") `);
        await queryRunner.query(`CREATE INDEX "IDX_382a10c52b5e00af7557f7a19f" ON "products" ("ownerId", "isActive") `);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_ff56834e735fa78a15d0cf21926"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_382a10c52b5e00af7557f7a19f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32cd206985f4311552152d81c2"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('order_confirmation', 'order_shipped', 'order_delivered', 'order_cancelled', 'payment_success', 'payment_failed', 'welcome', 'password_reset', 'email_verification', 'promotional', 'vendor_approved', 'vendor_rejected', 'vendor_suspended', 'vendor_activated')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "categoryId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_ff56834e735fa78a15d0cf21926" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "additionalImages"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "isNew"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "isTrending"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "sku"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "compareAtPrice"`);
    }

}
