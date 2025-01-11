import { Injectable } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CouponService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createCouponDto: CreateCouponDto) {
    try {
      const data: any = {};
      if (createCouponDto.name) {
        data.name = createCouponDto.name;
      }
      if (createCouponDto.description) {
        data.description = createCouponDto.description;
      }
      if (createCouponDto.amount_type) {
        data.amount_type = createCouponDto.amount_type;
      }
      if (createCouponDto.amount) {
        data.amount = createCouponDto.amount;
      }
      if (createCouponDto.max_uses) {
        data.max_uses = createCouponDto.max_uses;
      }
      if (createCouponDto.max_uses_per_user) {
        data.max_uses_per_user = createCouponDto.max_uses_per_user;
      }
      if (createCouponDto.starts_at) {
        data.starts_at = new Date(createCouponDto.starts_at);
      }
      if (createCouponDto.expires_at) {
        data.expires_at = new Date(createCouponDto.expires_at);
      }
      if (createCouponDto.min_type) {
        data.min_type = createCouponDto.min_type;
      }
      if (createCouponDto.min_amount) {
        data.min_amount = createCouponDto.min_amount;
      }
      if (createCouponDto.min_quantity) {
        data.min_quantity = createCouponDto.min_quantity;
      }

      await this.prisma.coupon.create({
        data: { ...data },
      });
      return {
        success: true,
        message: 'Coupon created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll() {
    try {
      const coupons = await this.prisma.coupon.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          amount_type: true,
          amount: true,
          max_uses: true,
          max_uses_per_user: true,
          starts_at: true,
          expires_at: true,
          min_type: true,
          min_amount: true,
          min_quantity: true,
          created_at: true,
          updated_at: true,
        },
      });
      return {
        success: true,
        data: coupons,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const coupon = await this.prisma.coupon.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          amount_type: true,
          amount: true,
          max_uses: true,
          max_uses_per_user: true,
          starts_at: true,
          expires_at: true,
          min_type: true,
          min_amount: true,
          min_quantity: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!coupon) {
        return {
          success: false,
          message: 'Coupon not found',
        };
      }
      return {
        success: true,
        data: coupon,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateCouponDto: UpdateCouponDto) {
    try {
      // check if coupon exists
      const coupon = await this.prisma.coupon.findUnique({
        where: { id },
      });
      if (!coupon) {
        return {
          success: false,
          message: 'Coupon not found',
        };
      }
      const data: any = {};
      if (updateCouponDto.name) {
        data.name = updateCouponDto.name;
      }
      if (updateCouponDto.description) {
        data.description = updateCouponDto.description;
      }
      if (updateCouponDto.amount_type) {
        data.amount_type = updateCouponDto.amount_type;
      }
      if (updateCouponDto.amount) {
        data.amount = updateCouponDto.amount;
      }
      if (updateCouponDto.max_uses) {
        data.max_uses = updateCouponDto.max_uses;
      }
      if (updateCouponDto.max_uses_per_user) {
        data.max_uses_per_user = updateCouponDto.max_uses_per_user;
      }
      if (updateCouponDto.starts_at) {
        data.starts_at = new Date(updateCouponDto.starts_at);
      }
      if (updateCouponDto.expires_at) {
        data.expires_at = new Date(updateCouponDto.expires_at);
      }
      if (updateCouponDto.min_type) {
        data.min_type = updateCouponDto.min_type;
      }
      if (updateCouponDto.min_amount) {
        data.min_amount = updateCouponDto.min_amount;
      }
      if (updateCouponDto.min_quantity) {
        data.min_quantity = updateCouponDto.min_quantity;
      }
      await this.prisma.coupon.update({
        where: { id },
        data: { ...data },
      });

      return {
        success: true,
        message: 'Coupon updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      // check if coupon exists
      const coupon = await this.prisma.coupon.findUnique({
        where: { id },
      });
      if (!coupon) {
        return {
          success: false,
          message: 'Coupon not found',
        };
      }
      await this.prisma.coupon.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Coupon deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
