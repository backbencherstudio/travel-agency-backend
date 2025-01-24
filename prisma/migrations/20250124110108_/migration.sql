-- CreateTable
CREATE TABLE "package_traveller_types" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "package_id" TEXT NOT NULL,
    "traveller_type_id" TEXT NOT NULL,
    "type" TEXT DEFAULT 'allowed',

    CONSTRAINT "package_traveller_types_pkey" PRIMARY KEY ("package_id","traveller_type_id")
);

-- AddForeignKey
ALTER TABLE "package_traveller_types" ADD CONSTRAINT "package_traveller_types_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_traveller_types" ADD CONSTRAINT "package_traveller_types_traveller_type_id_fkey" FOREIGN KEY ("traveller_type_id") REFERENCES "traveller_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
