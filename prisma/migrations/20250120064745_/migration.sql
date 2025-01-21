-- DropForeignKey
ALTER TABLE "package_tags" DROP CONSTRAINT "package_tags_package_id_fkey";

-- DropForeignKey
ALTER TABLE "package_tags" DROP CONSTRAINT "package_tags_tag_id_fkey";

-- AddForeignKey
ALTER TABLE "package_tags" ADD CONSTRAINT "package_tags_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_tags" ADD CONSTRAINT "package_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
