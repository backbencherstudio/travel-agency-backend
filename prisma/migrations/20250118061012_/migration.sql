-- AlterTable
ALTER TABLE "checkout_extra_services" ADD COLUMN     "package_id" TEXT;

-- AddForeignKey
ALTER TABLE "checkout_extra_services" ADD CONSTRAINT "checkout_extra_services_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
