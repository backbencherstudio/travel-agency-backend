import { Injectable } from '@nestjs/common';
import { CreateWebsiteInfoDto } from './dto/create-website-info.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class WebsiteInfoService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(
    createWebsiteInfoDto: CreateWebsiteInfoDto,
    files: {
      logo?: Express.Multer.File;
      favicon?: Express.Multer.File;
    },
  ) {
    try {
      const data: any = {};
      if (createWebsiteInfoDto.name) {
        data.name = createWebsiteInfoDto.name;
      }
      if (createWebsiteInfoDto.phone_number) {
        data.phone_number = createWebsiteInfoDto.phone_number;
      }
      if (createWebsiteInfoDto.email) {
        data.email = createWebsiteInfoDto.email;
      }
      if (createWebsiteInfoDto.address) {
        data.address = createWebsiteInfoDto.address;
      }
      if (createWebsiteInfoDto.copyright) {
        data.copyright = createWebsiteInfoDto.copyright;
      }
      if (files.logo) {
        // delete old logo from storage
        const logo = await this.prisma.websiteInfo.findFirst();
        if (logo) {
          SojebStorage.delete(appConfig().storageUrl.websiteInfo + logo.logo);
        }
        data.logo = files.logo.filename;
      }
      if (files.favicon) {
        // delete old favicon from storage
        const favicon = await this.prisma.websiteInfo.findFirst();
        if (favicon) {
          SojebStorage.delete(
            appConfig().storageUrl.websiteInfo + favicon.favicon,
          );
        }
        data.favicon = files.favicon.filename;
      }

      // check if website info already exists, then update it, otherwise create new
      const checkWebsiteInfo = await this.prisma.websiteInfo.findFirst();

      if (checkWebsiteInfo) {
        await this.prisma.websiteInfo.update({
          where: { id: checkWebsiteInfo.id },
          data: {
            ...data,
          },
        });
      } else {
        await this.prisma.websiteInfo.create({
          data: {
            ...data,
          },
        });
      }

      const websiteInfo = await this.prisma.websiteInfo.findFirst();

      if (files.logo) {
        await this.prisma.websiteInfo.update({
          where: { id: websiteInfo.id },
          data: { logo: files.logo[0].filename },
        });
      }

      if (files.favicon) {
        await this.prisma.websiteInfo.update({
          where: { id: websiteInfo.id },
          data: { favicon: files.favicon[0].filename },
        });
      }

      return {
        success: true,
        message: 'Website info updated successfully',
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
      const websiteInfo = await this.prisma.websiteInfo.findFirst({
        select: {
          id: true,
          name: true,
          phone_number: true,
          email: true,
          address: true,
          logo: true,
          favicon: true,
          copyright: true,
        },
      });
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
