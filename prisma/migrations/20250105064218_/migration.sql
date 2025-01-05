/*
  Warnings:

  - You are about to drop the column `message_id` on the `attachments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "attachments" DROP CONSTRAINT "attachments_message_id_fkey";

-- AlterTable
ALTER TABLE "attachments" DROP COLUMN "message_id";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "attachment_id" TEXT,
ADD COLUMN     "conversation_id" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
