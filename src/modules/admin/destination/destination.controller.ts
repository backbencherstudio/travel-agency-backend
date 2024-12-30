import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
} from '@nestjs/common';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { diskStorage } from 'multer';
import appConfig from 'src/config/app.config';
import { FilesInterceptor } from '@nestjs/platform-express';

@ApiBearerAuth()
@ApiTags('Destination')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/destination')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  @ApiOperation({ summary: 'Create destination' })
  @Post()
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination:
          appConfig().storageUrl.rootUrl +
          '/' +
          appConfig().storageUrl.destination,
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${file.originalname}`);
        },
      }),
    }),
  )
  async create(
    @Body() createDestinationDto: CreateDestinationDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10485760 }), // 10mb
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    images?: Express.Multer.File[],
  ) {
    try {
      const destination = await this.destinationService.create(
        createDestinationDto,
        images,
      );
      return destination;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get all destinations' })
  @Get()
  async findAll() {
    try {
      const destinations = await this.destinationService.findAll();
      return destinations;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get destination by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const destination = await this.destinationService.findOne(id);
      return destination;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Update destination by id' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDestinationDto: UpdateDestinationDto,
  ) {
    try {
      const destination = await this.destinationService.update(
        id,
        updateDestinationDto,
      );
      return destination;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete destination by id' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const destination = await this.destinationService.remove(id);
      return destination;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
