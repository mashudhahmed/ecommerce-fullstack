import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatMessagesTable1784300000000 implements MigrationInterface {
  name = 'CreateChatMessagesTable1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" SERIAL PRIMARY KEY,
        "senderId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "recipientId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "content" text NOT NULL,
        "orderId" integer,
        "productId" integer,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_senderId" ON "chat_messages" ("senderId");
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_recipientId" ON "chat_messages" ("recipientId");
      CREATE INDEX IF NOT EXISTS "IDX_chat_messages_createdAt" ON "chat_messages" ("createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages";`);
  }
}
