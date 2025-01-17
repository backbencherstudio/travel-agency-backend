-- CreateTable
CREATE TABLE "checkout_travellers" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "checkout_id" TEXT,
    "type" TEXT DEFAULT 'adult',
    "gender" TEXT,
    "full_name" TEXT,
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

    CONSTRAINT "checkout_travellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_extra_services" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "checkout_id" TEXT,
    "extra_service_id" TEXT,

    CONSTRAINT "checkout_extra_services_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "checkout_travellers" ADD CONSTRAINT "checkout_travellers_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_extra_services" ADD CONSTRAINT "checkout_extra_services_checkout_id_fkey" FOREIGN KEY ("checkout_id") REFERENCES "checkouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_extra_services" ADD CONSTRAINT "checkout_extra_services_extra_service_id_fkey" FOREIGN KEY ("extra_service_id") REFERENCES "extra_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
