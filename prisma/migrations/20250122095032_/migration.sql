/*
  Warnings:

  - You are about to drop the column `language` on the `packages` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "packages" DROP COLUMN "language",
ADD COLUMN     "language_id" TEXT;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
