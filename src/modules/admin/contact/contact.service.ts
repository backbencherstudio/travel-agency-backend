import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ContactService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createContactDto: CreateContactDto) {
    try {
      await this.prisma.contact.create({
        data: createContactDto,
      });
      return {
        success: true,
        message: 'Contact created successfully',
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
      const contacts = await this.prisma.contact.findMany({
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          message: true,
        },
      });
      return {
        success: true,
        data: contacts,
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
      const contact = await this.prisma.contact.findUnique({
        where: { id },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          message: true,
        },
      });
      return {
        success: true,
        data: contact,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateContactDto: UpdateContactDto) {
    try {
      await this.prisma.contact.update({
        where: { id },
        data: updateContactDto,
      });
      return {
        success: true,
        message: 'Contact updated successfully',
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
      await this.prisma.contact.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Contact deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
