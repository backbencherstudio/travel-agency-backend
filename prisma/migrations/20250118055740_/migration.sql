-- DropForeignKey
ALTER TABLE "checkouts" DROP CONSTRAINT "checkouts_user_id_fkey";

-- AddForeignKey
ALTER TABLE "checkouts" ADD CONSTRAINT "checkouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
