import { Injectable } from '@nestjs/common';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class FaqService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createFaqDto: CreateFaqDto) {
    try {
      const data = {};
      if (createFaqDto.question) {
        data['question'] = createFaqDto.question;
      }
      if (createFaqDto.answer) {
        data['answer'] = createFaqDto.answer;
      }
      await this.prisma.faq.create({
        data: {
          ...data,
        },
      });
      return {
        success: true,
        message: 'Faq created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create faq',
      };
    }
  }

  async findAll() {
    try {
      const faqs = await this.prisma.faq.findMany({
        orderBy: {
          sort_order: 'asc',
        },
        select: {
          id: true,
          question: true,
          answer: true,
          sort_order: true,
        },
      });
      return {
        success: true,
        data: faqs,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch faq',
      };
    }
  }

  async findOne(id: string) {
    try {
      const faq = await this.prisma.faq.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          question: true,
          answer: true,
          sort_order: true,
        },
      });
      return {
        success: true,
        data: faq,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch faq',
      };
    }
  }

  async update(id: string, updateFaqDto: UpdateFaqDto) {
    try {
      const data = {};
      if (updateFaqDto.question) {
        data['question'] = updateFaqDto.question;
      }
      const faq = await this.prisma.faq.update({
        where: {
          id: id,
        },
        data: {
          ...data,
        },
      });
      return {
        success: true,
        data: faq,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update faq',
      };
    }
  }

  async remove(id: string) {
    try {
      const faq = await this.prisma.faq.delete({
        where: {
          id: id,
        },
      });
      return {
        success: true,
        data: faq,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to delete faq',
      };
    }
  }
}
