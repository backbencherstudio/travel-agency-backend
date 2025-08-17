import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CheckoutRepository {
  /**
   * calculate total price
   * @returns final price after all calculations
   */
  static async calculateTotalPrice(checkout_id: string) {
    const checkout = await prisma.checkout.findUnique({
      where: {
        id: checkout_id,
      },
      include: {
        checkout_items: true,
        checkout_extra_services: {
          include: {
            extra_service: true,
          },
        },
      },
    });

    if (!checkout) {
      return 0;
    }

    // Calculate total from checkout items (which already include pricing)
    let total = 0;
    for (const item of checkout.checkout_items) {
      // Use final_price if available, otherwise use total_price
      const itemPrice = Number(item.final_price || item.total_price || 0);
      total += itemPrice;
    }

    // Add extra services if any
    for (const service of checkout.checkout_extra_services) {
      const servicePrice = Number(service.extra_service.price || 0);
      total += servicePrice;
    }

    return total;
  }

  static async calculateSubTotalPrice(checkout_id: string) {
    const checkout = await prisma.checkout.findUnique({
      where: {
        id: checkout_id,
      },
      include: {
        checkout_items: true,
        checkout_extra_services: {
          include: {
            extra_service: true,
          },
        },
      },
    });

    if (!checkout) {
      return 0;
    }

    let subtotal: number = 0;

    // Calculate subtotal from checkout items (before discounts)
    for (const item of checkout.checkout_items) {
      const itemPrice = Number(item.total_price || 0);
      subtotal += itemPrice;
    }

    // Calculate extra services
    for (const service of checkout.checkout_extra_services) {
      const servicePrice = Number(service.extra_service.price || 0);
      subtotal += servicePrice;
    }

    return subtotal;
  }

  static async calculateCoupon(checkout_id: string) {
    const checkout = await prisma.checkout.findUnique({
      where: {
        id: checkout_id,
      },
      include: {
        checkout_items: true,
      },
    });

    if (!checkout) {
      return [];
    }

    const temp_redems = await prisma.tempRedeem.findMany({
      where: {
        checkout_id: checkout_id,
      },
      include: {
        coupon: true,
      },
    });

    const amountArray = [];
    for (const redeem of temp_redems) {
      if (redeem.coupon.method == 'code') {
        amountArray.push({
          amount: Number(redeem.coupon.amount),
          amount_type: redeem.coupon.amount_type,
        });
      }
    }

    return amountArray;
  }
}
