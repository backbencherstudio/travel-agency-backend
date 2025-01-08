import { Injectable } from '@nestjs/common';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CheckoutService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  create(createCheckoutDto: CreateCheckoutDto) {
    return 'This action adds a new checkout';
  }

  async findOne(id: string, traveller_count: number) {
    try {
      const packageData = await this.prisma.package.findUnique({
        where: { id: id },
        select: {
          id: true,
          name: true,
          price: true,
          destination: {
            select: {
              id: true,
              name: true,
              country: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      return {
        success: true,
        data: {
          currency: 'USD',
          package: packageData,
          fees: 50,
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
