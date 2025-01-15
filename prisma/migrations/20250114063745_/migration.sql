/*
  Warnings:

  - The `duration` column on the `packages` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "packages" DROP COLUMN "duration",
ADD COLUMN     "duration" INTEGER;
