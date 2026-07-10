import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNotificationDeliveryFields1783674929495 implements MigrationInterface {
    name = 'AddNotificationDeliveryFields1783674929495'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "deliveryStatus" character varying(20) NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "deliveredAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "deliveryAttempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD "deliveryError" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "deliveryError"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "deliveryAttempts"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "deliveredAt"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "deliveryStatus"`);
    }

}
