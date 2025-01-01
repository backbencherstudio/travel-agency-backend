-- DropForeignKey
ALTER TABLE "destination_images" DROP CONSTRAINT "destination_images_destination_id_fkey";

-- DropForeignKey
ALTER TABLE "package_trip_plan_images" DROP CONSTRAINT "package_trip_plan_images_package_trip_plan_id_fkey";

-- AddForeignKey
ALTER TABLE "destination_images" ADD CONSTRAINT "destination_images_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_trip_plan_images" ADD CONSTRAINT "package_trip_plan_images_package_trip_plan_id_fkey" FOREIGN KEY ("package_trip_plan_id") REFERENCES "package_trip_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
