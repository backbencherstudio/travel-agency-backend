-- AlterTable
ALTER TABLE "package_cancellation_policies" ADD COLUMN     "user_id" TEXT;

-- AddForeignKey
ALTER TABLE "package_cancellation_policies" ADD CONSTRAINT "package_cancellation_policies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
