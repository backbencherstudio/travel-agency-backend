-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "coupon_ids" TEXT,
ADD COLUMN     "coupon_type" TEXT DEFAULT 'order';
