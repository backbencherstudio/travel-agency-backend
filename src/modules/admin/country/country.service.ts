import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCountryDto, BatchCreateCountryDto } from './dto/create-country.dto';

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

  async create(createCountryDto: CreateCountryDto) {
    try {
      const country = await this.prisma.country.create({
        data: {
          name: createCountryDto.name,
          country_code: createCountryDto.country_code,
          dial_code: createCountryDto.dial_code,
          flag: createCountryDto.flag,
        },
      });
      return {
        success: true,
        data: country,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async batchCreate(batchCreateCountryDto: BatchCreateCountryDto) {
    try {
      const countries = batchCreateCountryDto.countries;
      const createdCountries = [];

      for (const countryDto of countries) {
        const country = await this.prisma.country.create({
          data: {
            name: countryDto.name,
            country_code: countryDto.country_code,
            dial_code: countryDto.dial_code,
            flag: countryDto.flag,
          },
        });
        createdCountries.push(country);
      }

      return {
        success: true,
        data: createdCountries,
        message: `Successfully created ${createdCountries.length} countries`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
