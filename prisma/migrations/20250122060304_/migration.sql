/*
  Warnings:

  - You are about to drop the column `destination_id` on the `packages` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "packages" DROP CONSTRAINT "packages_destination_id_fkey";

-- AlterTable
ALTER TABLE "packages" DROP COLUMN "destination_id";

-- CreateTable
CREATE TABLE "package_destinations" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "package_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,

    CONSTRAINT "package_destinations_pkey" PRIMARY KEY ("package_id","destination_id")
);

-- CreateTable
CREATE TABLE "user_payment_methods" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "payment_method_id" TEXT,
    "checkout_id" TEXT,

    CONSTRAINT "user_payment_methods_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "package_destinations" ADD CONSTRAINT "package_destinations_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_destinations" ADD CONSTRAINT "package_destinations_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
