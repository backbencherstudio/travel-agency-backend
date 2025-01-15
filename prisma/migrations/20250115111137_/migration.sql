-- AlterTable
ALTER TABLE "temp_redeems" ADD COLUMN     "checkout_id" TEXT;

-- AddForeignKey
ALTER TABLE "temp_redeems" ADD CONSTRAINT "temp_redeems_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
