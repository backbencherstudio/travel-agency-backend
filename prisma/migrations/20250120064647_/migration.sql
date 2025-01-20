-- DropForeignKey
ALTER TABLE "package_categories" DROP CONSTRAINT "package_categories_category_id_fkey";

-- DropForeignKey
ALTER TABLE "package_categories" DROP CONSTRAINT "package_categories_package_id_fkey";

-- AddForeignKey
ALTER TABLE "package_categories" ADD CONSTRAINT "package_categories_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_categories" ADD CONSTRAINT "package_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
