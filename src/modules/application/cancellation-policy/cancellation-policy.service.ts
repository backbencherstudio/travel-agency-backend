import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CancellationPolicyService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll() {
    try {
      const websiteInfo = await this.prisma.websiteInfo.findFirst({
        select: {
          cancellation_policy: true,
        },
      });

      if (!websiteInfo) {
        return {
          success: false,
          message: 'Website info not found',
        };
      }

      return {
        success: true,
        data: websiteInfo,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
