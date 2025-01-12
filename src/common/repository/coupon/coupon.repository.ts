import { Coupon, PrismaClient } from '@prisma/client';
import { DateHelper } from 'src/common/helper/date.helper';

const prisma = new PrismaClient();

export class CouponRepository {
  /**
   * Update like count
   * @returns
   */
  static async applyCoupon(
    user_id: string,
    coupon_code: string,
    package_id?: string | null,
  ) {
    try {
      const coupon = await prisma.coupon.findFirst({
        where: {
          code: coupon_code,
          method: 'code',
        },
      });
      // make sure coupon exists
      if (!coupon) {
        return {
          success: false,
          message: 'Coupon not found',
        };
      }

      // make sure product exists
      if (package_id) {
        const packageData = await prisma.package.findFirst({
          where: {
            id: package_id,
          },
        });
        if (!packageData) {
          return {
            success: false,
            message: 'Package not found',
          };
        }

        if (packageData.status != 1) {
          return {
            success: false,
            message: 'Package is not active',
          };
        }
      }

      // make sure coupon is not expired and available
      if (
        coupon.status == 0 ||
        this._isExpired(coupon) ||
        !this._isAvailable(coupon)
      ) {
        return {
          success: false,
          message: 'Coupon is not active or it has expired',
        };
      }

      // limit
      // make sure coupon usage
      if (coupon.max_uses != null) {
        const total_usages = await prisma.bookingCoupon.count({
          where: {
            coupon_id: coupon.id,
          },
        });
        if (total_usages >= coupon.max_uses) {
          return {
            success: false,
            message: 'Coupon is exceeded maximum usage',
          };
        }
      }

      // make sure coupon usage for single user
      if (coupon.max_uses_per_user != null) {
        const user_usages = await prisma.bookingCoupon.count({
          where: {
            coupon_id: coupon.id,
            user_id: user_id,
          },
        });
        if (user_usages >= coupon.max_uses_per_user) {
          return {
            success: false,
            message: 'Coupon is exceeded maximum usage for this user',
          };
        }
      }

      // maximum purchase requirements
      if (coupon.min_type == 'amount') {
        const package_data = await prisma.package.findFirst({
          where: {
            id: package_id,
          },
        });

        const total_amount = package_data.price;

        if (total_amount < coupon.min_amount) {
          return {
            success: false,
            message: 'Coupon is not applied for minimum purchase amount',
          };
        }
      } else if (coupon.min_type == 'quantity') {
        const productCount = 1;
        if (productCount < coupon.min_quantity) {
          return {
            success: false,
            message: 'Coupon is not applied for minimum quantity of items',
          };
        }
      }

      //
      return {
        success: true,
        message: 'Coupon applied successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  private static async _isExpired(coupon: Coupon) {
    if (coupon.expires_at != null) {
      if (coupon.expires_at >= DateHelper.now()) {
        // not expired
        return false;
      } else {
        // expired
        return true;
      }
    } else {
      // no expiration date
      return false;
    }
  }

  private static async _isAvailable(coupon: Coupon) {
    if (coupon.starts_at != null) {
      if (coupon.starts_at > DateHelper.now()) {
        // not available
        return false;
      } else {
        // available
        return true;
      }
    } else {
      // no start date
      return true;
    }
  }
}
