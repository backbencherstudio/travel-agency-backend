-- AlterTable
ALTER TABLE "package_availabilities" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "duration_type" TEXT DEFAULT 'day';

-- AlterTable
ALTER TABLE "packages" ADD COLUMN     "region_type" TEXT DEFAULT 'national';
