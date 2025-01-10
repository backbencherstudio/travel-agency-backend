-- AlterTable
ALTER TABLE "website_infos" ADD COLUMN     "cancellation_policy" TEXT;

-- CreateTable
CREATE TABLE "booking_travellers" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "booking_id" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "phone_number" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip_code" TEXT,
    "country" TEXT,

    CONSTRAINT "booking_travellers_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "booking_travellers" ADD CONSTRAINT "booking_travellers_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
