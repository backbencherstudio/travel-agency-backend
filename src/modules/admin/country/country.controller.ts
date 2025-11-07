import { Controller, Get, Post, Body } from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto, BatchCreateCountryDto } from './dto/create-country.dto';

import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Country')
@Controller('admin/country')
export class CountryController {
  constructor(private readonly countryService: CountryService) { }


  @ApiOperation({ summary: 'Create multiple countries at once' })
  @Post('batch-create')
  async batchCreate(@Body() batchCreateCountryDto: BatchCreateCountryDto) {
    try {
      const result = await this.countryService.batchCreate(batchCreateCountryDto);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  
  @ApiOperation({ summary: 'Get all countries' })
  @Get()
  async findAll() {
    try {
      const countries = await this.countryService.findAll();

      return countries;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
  @ApiOperation({ summary: 'Create a new country' })
  @Post()
  async create(@Body() createCountryDto: CreateCountryDto) {
    try {
      const country = await this.countryService.create(createCountryDto);
      return country;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
