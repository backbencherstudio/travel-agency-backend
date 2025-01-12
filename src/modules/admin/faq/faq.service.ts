import { Injectable } from '@nestjs/common';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DateHelper } from '../../../common/helper/date.helper';

@Injectable()
export class FaqService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createFaqDto: CreateFaqDto) {
    try {
      const data: any = {};

      const question = createFaqDto.question;
      const answer = createFaqDto.answer;
      const sort_order = createFaqDto.sort_order;

      if (question) {
        data['question'] = question;
      }
      if (answer) {
        data['answer'] = answer;
      }
      if (sort_order) {
        data['sort_order'] = sort_order;
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
        message: error.message,
      };
    }
  }

  async batchCreate(createFaqDto: CreateFaqDto) {
    try {
      const faqs = createFaqDto.faqs;
      for (const faq of faqs) {
        const question = faq.question;
        const answer = faq.answer;
        const sort_order = faq.sort_order;

        const faqData: any = {};
        if (question) {
          faqData['question'] = question;
        }
        if (answer) {
          faqData['answer'] = answer;
        }
        if (sort_order) {
          faqData['sort_order'] = sort_order;
        }

        await this.prisma.faq.create({
          data: {
            ...faqData,
          },
        });
      }
      return {
        success: true,
        message: 'Faq created successfully',
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
        message: error.message,
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
        message: error.message,
      };
    }
  }

  async batchUpdate(createFaqDto: CreateFaqDto) {
    try {
      const faqs = createFaqDto.faqs;
      for (const faq of faqs) {
        const id = faq.id;
        const question = faq.question;
        const answer = faq.answer;
        const sort_order = faq.sort_order;

        const faqData: any = {};
        if (id) {
          faqData['id'] = id;
        } else {
          return {
            success: false,
            message: 'Id not found',
          };
        }
        if (question) {
          faqData['question'] = question;
        }
        if (answer) {
          faqData['answer'] = answer;
        }
        if (sort_order) {
          faqData['sort_order'] = sort_order;
        }

        const faqExist = await this.prisma.faq.findUnique({
          where: {
            id: id,
          },
        });
        if (!faqExist) {
          return {
            success: false,
            message: 'Faq not found',
          };
        }

        await this.prisma.faq.update({
          where: {
            id: id,
          },
          data: {
            ...faqData,
          },
        });
      }
      return {
        success: true,
        message: 'Faq created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateFaqDto: UpdateFaqDto) {
    try {
      const data = {};
      if (updateFaqDto.question) {
        data['question'] = updateFaqDto.question;
      }
      await this.prisma.faq.update({
        where: {
          id: id,
        },
        data: {
          ...data,
          updated_at: DateHelper.now(),
        },
      });
      return {
        success: true,
        message: 'Faq updated successfully',
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
      await this.prisma.faq.delete({
        where: {
          id: id,
        },
      });
      return {
        success: true,
        message: 'Faq deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
