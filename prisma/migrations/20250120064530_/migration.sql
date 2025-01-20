/*
  Warnings:

  - You are about to drop the `package_images` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "package_images" DROP CONSTRAINT "package_images_package_id_fkey";

-- DropTable
DROP TABLE "package_images";

-- CreateTable
CREATE TABLE "package_files" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "sort_order" INTEGER DEFAULT 0,
    "package_id" TEXT,
    "file" TEXT,
    "file_alt" TEXT,
    "type" TEXT,

    CONSTRAINT "package_files_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "package_files" ADD CONSTRAINT "package_files_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
