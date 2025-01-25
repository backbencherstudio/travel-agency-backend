-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "amount" DECIMAL(65,30),
ADD COLUMN     "currency" TEXT;
