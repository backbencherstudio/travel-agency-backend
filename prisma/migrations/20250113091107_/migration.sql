/*
  Warnings:

  - A unique constraint covering the columns `[invoice_number]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "comments" TEXT,
ADD COLUMN     "invoice_number" TEXT;

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "language" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bookings_invoice_number_key" ON "bookings"("invoice_number");
