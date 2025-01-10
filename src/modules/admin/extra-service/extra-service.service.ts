import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateExtraServiceDto } from './dto/create-extra-service.dto';
import { UpdateExtraServiceDto } from './dto/update-extra-service.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ExtraServiceService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createExtraServiceDto: CreateExtraServiceDto) {
    try {
      await this.prisma.extraService.create({
        data: createExtraServiceDto,
      });

      return {
        success: true,
        message: 'Extra service created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  findAll() {
    return `This action returns all extraService`;
  }

  findOne(id: number) {
    return `This action returns a #${id} extraService`;
  }

  update(id: number, updateExtraServiceDto: UpdateExtraServiceDto) {
    return `This action updates a #${id} extraService`;
  }

  remove(id: number) {
    return `This action removes a #${id} extraService`;
  }
}
