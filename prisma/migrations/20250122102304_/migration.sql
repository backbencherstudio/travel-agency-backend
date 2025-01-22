/*
  Warnings:

  - You are about to drop the column `language_id` on the `packages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "packages" DROP CONSTRAINT "packages_language_id_fkey";

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "language_id";

-- CreateTable
CREATE TABLE "package_languages" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "package_id" TEXT NOT NULL,
    "language_id" TEXT NOT NULL,

    CONSTRAINT "package_languages_pkey" PRIMARY KEY ("package_id","language_id")
);

-- CreateTable
CREATE TABLE "traveller_types" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "type" TEXT,

    CONSTRAINT "traveller_types_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "package_languages" ADD CONSTRAINT "package_languages_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_languages" ADD CONSTRAINT "package_languages_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
