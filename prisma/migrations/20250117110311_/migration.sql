-- DropForeignKey
ALTER TABLE "checkout_extra_services" DROP CONSTRAINT "checkout_extra_services_checkout_id_fkey";

-- DropForeignKey
ALTER TABLE "checkout_extra_services" DROP CONSTRAINT "checkout_extra_services_extra_service_id_fkey";

-- DropForeignKey
ALTER TABLE "checkout_items" DROP CONSTRAINT "checkout_items_checkout_id_fkey";

-- DropForeignKey
ALTER TABLE "checkout_items" DROP CONSTRAINT "checkout_items_package_id_fkey";

-- DropForeignKey
ALTER TABLE "checkout_travellers" DROP CONSTRAINT "checkout_travellers_checkout_id_fkey";

-- DropForeignKey
ALTER TABLE "checkouts" DROP CONSTRAINT "checkouts_user_id_fkey";

-- DropForeignKey
ALTER TABLE "checkouts" DROP CONSTRAINT "checkouts_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "temp_redeems" DROP CONSTRAINT "temp_redeems_checkout_id_fkey";

-- DropForeignKey
ALTER TABLE "temp_redeems" DROP CONSTRAINT "temp_redeems_coupon_id_fkey";

-- DropForeignKey
ALTER TABLE "temp_redeems" DROP CONSTRAINT "temp_redeems_user_id_fkey";

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_items" ADD CONSTRAINT "checkout_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_travellers" ADD CONSTRAINT "checkout_travellers_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_extra_services" ADD CONSTRAINT "checkout_extra_services_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_extra_services" ADD CONSTRAINT "checkout_extra_services_extra_service_id_fkey" FOREIGN KEY ("extra_service_id") REFERENCES "extra_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_redeems" ADD CONSTRAINT "temp_redeems_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_redeems" ADD CONSTRAINT "temp_redeems_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_redeems" ADD CONSTRAINT "temp_redeems_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
