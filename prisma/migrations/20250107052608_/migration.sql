/*
  Warnings:

  - You are about to drop the column `package_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `rating` on the `reviews` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_package_id_fkey";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "package_id",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "booking_date_time" TIMESTAMP(3),
ADD COLUMN     "email" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "paid_amount" DECIMAL(65,30),
ADD COLUMN     "paid_currency" TEXT,
ADD COLUMN     "payment_provider" TEXT,
ADD COLUMN     "payment_provider_charge" DECIMAL(65,30),
ADD COLUMN     "payment_provider_charge_type" TEXT DEFAULT 'percentage',
ADD COLUMN     "payment_raw_status" TEXT,
ADD COLUMN     "payment_reference_number" TEXT,
ADD COLUMN     "payment_status" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "total_amount" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "rating",
ADD COLUMN     "rating_value" INTEGER;

-- CreateTable
CREATE TABLE "booking_items" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "booking_id" TEXT,
    "package_id" TEXT,
    "quantity" INTEGER DEFAULT 1,
    "price" DECIMAL(65,30),

    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_coupons" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "booking_id" TEXT,
    "coupon_id" TEXT,
    "method" TEXT DEFAULT 'code',
    "code" TEXT,
    "amount_type" TEXT DEFAULT 'percentage',
    "amount" DECIMAL(65,30),

    CONSTRAINT "booking_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "status" SMALLINT DEFAULT 1,
    "method" TEXT DEFAULT 'code',
    "code" TEXT,
    "name" TEXT,
    "description" TEXT,
    "amount_type" TEXT DEFAULT 'percentage',
    "amount" DECIMAL(65,30),
    "uses" INTEGER DEFAULT 0,
    "max_uses" INTEGER DEFAULT 1,
    "max_uses_per_user" INTEGER DEFAULT 1,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "min_type" TEXT,
    "min_amount" DECIMAL(65,30),
    "min_quantity" INTEGER,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_coupons" ADD CONSTRAINT "booking_coupons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_coupons" ADD CONSTRAINT "booking_coupons_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_coupons" ADD CONSTRAINT "booking_coupons_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
