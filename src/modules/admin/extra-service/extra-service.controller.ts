import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ExtraServiceService } from './extra-service.service';
import { CreateExtraServiceDto } from './dto/create-extra-service.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UpdateExtraServiceDto } from './dto/update-extra-service.dto';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('Extra Service')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/extra-service')
export class ExtraServiceController {
  constructor(private readonly extraServiceService: ExtraServiceService) {}

  @ApiOperation({ summary: 'Create extra service' })
  @Post()
  async create(@Body() createExtraServiceDto: CreateExtraServiceDto) {
    try {
      const extraService = await this.extraServiceService.create(
        createExtraServiceDto,
      );

      return extraService;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get all extra services' })
  @Get()
  findAll() {
    return this.extraServiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.extraServiceService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExtraServiceDto: UpdateExtraServiceDto,
  ) {
    return this.extraServiceService.update(+id, updateExtraServiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.extraServiceService.remove(+id);
  }
}
