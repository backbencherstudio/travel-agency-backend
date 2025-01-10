-- AlterTable
ALTER TABLE "booking_travellers" ADD COLUMN     "full_name" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "type" TEXT DEFAULT 'adult';
