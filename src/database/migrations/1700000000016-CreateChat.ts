import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChat1700000000016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "chat_rooms" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "tenant_id" uuid NOT NULL,
        "name" varchar(200),
        "type" varchar(50) DEFAULT 'group',
        "participant_ids" uuid[] DEFAULT '{}',
        "course_id" uuid,
        "group_id" uuid,
        "last_message" text,
        "last_message_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_chat_rooms" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "chat_messages" (
        "id" uuid DEFAULT gen_random_uuid() NOT NULL,
        "room_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "tenant_id" uuid NOT NULL,
        "type" varchar(50) DEFAULT 'text',
        "content" text,
        "file_id" uuid,
        "is_edited" boolean DEFAULT false,
        "is_deleted" boolean DEFAULT false,
        "read_by" uuid[] DEFAULT '{}',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "pk_chat_messages" PRIMARY KEY ("id"),
        CONSTRAINT "fk_msg_room" FOREIGN KEY ("room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_rooms"`);
  }
}
