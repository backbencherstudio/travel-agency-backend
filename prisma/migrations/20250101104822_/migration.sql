-- DropForeignKey
ALTER TABLE "package_images" DROP CONSTRAINT "package_images_package_id_fkey";

-- DropForeignKey
ALTER TABLE "package_trip_plans" DROP CONSTRAINT "package_trip_plans_package_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_package_id_fkey";

-- AlterTable
ALTER TABLE "package_tags" ADD COLUMN     "type" TEXT;

-- AddForeignKey
ALTER TABLE "package_trip_plans" ADD CONSTRAINT "package_trip_plans_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_images" ADD CONSTRAINT "package_images_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
