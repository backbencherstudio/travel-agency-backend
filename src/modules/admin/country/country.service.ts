import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CountryService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll() {
    try {
      const countries = await this.prisma.country.findMany({
        select: {
          id: true,
          name: true,
          flag: true,
        },
      });
      return {
        success: true,
        data: countries,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
