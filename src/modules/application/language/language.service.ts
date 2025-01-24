import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class LanguageService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll() {
    try {
      const languages = await this.prisma.language.findMany({
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      return {
        success: true,
        data: languages,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
