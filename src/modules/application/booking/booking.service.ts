import { Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BookingService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createBookingDto: CreateBookingDto) {
    try {
      const data: any = {};
      if (createBookingDto.package_id) {
        data.package_id = createBookingDto.package_id;
      }
      const booking = await this.prisma.booking.create({
        data: {
          ...data,
        },
      });
      return booking;
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return `This action returns all booking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
