-- CreateTable
CREATE TABLE "extra_services" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "name" TEXT,
    "description" TEXT,
    "price" DECIMAL(65,30),

    CONSTRAINT "extra_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_extra_services" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "package_id" TEXT,
    "extra_service_id" TEXT,

    CONSTRAINT "package_extra_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_extra_services" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "booking_id" TEXT,
    "extra_service_id" TEXT,
    "price" DECIMAL(65,30),

    CONSTRAINT "booking_extra_services_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "package_extra_services" ADD CONSTRAINT "package_extra_services_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_extra_services" ADD CONSTRAINT "package_extra_services_extra_service_id_fkey" FOREIGN KEY ("extra_service_id") REFERENCES "extra_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_extra_services" ADD CONSTRAINT "booking_extra_services_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_extra_services" ADD CONSTRAINT "booking_extra_services_extra_service_id_fkey" FOREIGN KEY ("extra_service_id") REFERENCES "extra_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
