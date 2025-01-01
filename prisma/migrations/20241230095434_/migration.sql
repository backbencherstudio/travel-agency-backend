/*
  Warnings:

  - You are about to drop the column `distination_id` on the `packages` table. All the data in the column will be lost.
  - You are about to drop the `distination_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `distinations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "distination_images" DROP CONSTRAINT "distination_images_distination_id_fkey";

-- DropForeignKey
ALTER TABLE "packages" DROP CONSTRAINT "packages_distination_id_fkey";

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "distination_id",
ADD COLUMN     "destination_id" TEXT;

-- DropTable
DROP TABLE "distination_images";

-- DropTable
DROP TABLE "distinations";

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "name" TEXT,
    "description" TEXT,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_images" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "sort_order" INTEGER DEFAULT 0,
    "destination_id" TEXT,
    "image" TEXT,
    "image_alt" TEXT,

    CONSTRAINT "destination_images_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "destination_images" ADD CONSTRAINT "destination_images_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
