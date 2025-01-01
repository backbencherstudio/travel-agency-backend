/*
  Warnings:

  - You are about to drop the column `vendor_id` on the `destinations` table. All the data in the column will be lost.
  - You are about to drop the column `capacity` on the `packages` table. All the data in the column will be lost.
  - You are about to drop the column `vendor_id` on the `packages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "destinations" DROP CONSTRAINT "destinations_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "packages" DROP CONSTRAINT "packages_vendor_id_fkey";

-- AlterTable
ALTER TABLE "destinations" DROP COLUMN "vendor_id";

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "capacity",
DROP COLUMN "vendor_id",
ADD COLUMN     "max_capacity" INTEGER DEFAULT 1,
ADD COLUMN     "min_capacity" INTEGER DEFAULT 1;
