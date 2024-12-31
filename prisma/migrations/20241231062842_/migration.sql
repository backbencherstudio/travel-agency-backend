-- DropForeignKey
ALTER TABLE "packages" DROP CONSTRAINT "packages_user_id_fkey";

-- AlterTable
ALTER TABLE "destinations" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "user_id" TEXT,
ADD COLUMN     "vendor_id" TEXT;

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "vendor_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
