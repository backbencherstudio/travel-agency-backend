import { Injectable } from '@nestjs/common';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { UpdateGiftCardDto } from './dto/update-gift-card.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class GiftCardService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createGiftCardDto: CreateGiftCardDto) {
    try {
      const data: any = {};

      if (createGiftCardDto.code) data.code = createGiftCardDto.code;
      if (createGiftCardDto.amount) data.amount = createGiftCardDto.amount;
      if (createGiftCardDto.currency) data.currency = createGiftCardDto.currency;
      if (createGiftCardDto.purchaser_id) data.purchaser_id = createGiftCardDto.purchaser_id;
      if (createGiftCardDto.recipient_id) data.recipient_id = createGiftCardDto.recipient_id;
      if (createGiftCardDto.title) data.title = createGiftCardDto.title;
      if (createGiftCardDto.message) data.message = createGiftCardDto.message;
      if (createGiftCardDto.design_type) data.design_type = createGiftCardDto.design_type;
      if (createGiftCardDto.issued_at) data.issued_at = new Date(createGiftCardDto.issued_at);
      if (createGiftCardDto.expires_at) data.expires_at = new Date(createGiftCardDto.expires_at);

      const giftCard = await this.prisma.giftCard.create({
        data: { ...data },
      });

      return {
        success: true,
        message: 'Gift card created successfully',
        data: giftCard,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll(
    { q = null, status = null }: { q?: string; status?: number },
    pagination?: { page?: number; limit?: number },
  ) {
    try {
      const where: any = { deleted_at: null };

      if (q) {
        where.OR = [
          { code: { contains: q, mode: 'insensitive' } },
          { title: { contains: q, mode: 'insensitive' } },
        ];
      }

      if (status !== null && status !== undefined) {
        where.status = status;
      }

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;

      const [giftCards, total] = await Promise.all([
        this.prisma.giftCard.findMany({
          where,
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.giftCard.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        success: true,
        data: giftCards,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findOne(id: string) {
    try {
      const giftCard = await this.prisma.giftCard.findUnique({
        where: { id, deleted_at: null },
      });

      if (!giftCard) {
        return { success: false, message: 'Gift card not found' };
      }

      return { success: true, data: giftCard };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async update(id: string, updateGiftCardDto: UpdateGiftCardDto) {
    try {
      const existingGiftCard = await this.prisma.giftCard.findUnique({
        where: { id, deleted_at: null },
      });

      if (!existingGiftCard) {
        return { success: false, message: 'Gift card not found' };
      }

      const data: any = { updated_at: new Date() };

      if (updateGiftCardDto.code) data.code = updateGiftCardDto.code;
      if (updateGiftCardDto.amount !== undefined) data.amount = updateGiftCardDto.amount;
      if (updateGiftCardDto.currency) data.currency = updateGiftCardDto.currency;
      if (updateGiftCardDto.title) data.title = updateGiftCardDto.title;
      if (updateGiftCardDto.message) data.message = updateGiftCardDto.message;
      if (updateGiftCardDto.expires_at) data.expires_at = new Date(updateGiftCardDto.expires_at);

      const updatedGiftCard = await this.prisma.giftCard.update({
        where: { id },
        data
      });

      return {
        success: true,
        message: 'Gift card updated successfully',
        data: updatedGiftCard,
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async remove(id: string) {
    try {
      const existingGiftCard = await this.prisma.giftCard.findUnique({
        where: { id, deleted_at: null },
      });

      if (!existingGiftCard) {
        return { success: false, message: 'Gift card not found' };
      }

      await this.prisma.giftCard.update({
        where: { id },
        data: { deleted_at: new Date(), updated_at: new Date() },
      });

      return { success: true, message: 'Gift card deleted successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findByCode(code: string) {
    try {
      const giftCard = await this.prisma.giftCard.findUnique({
        where: { code, deleted_at: null },
      });

      if (!giftCard) {
        return { success: false, message: 'Gift card not found' };
      }

      return { success: true, data: giftCard };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}