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
  Req,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { PackageService } from './package.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Express, Request } from 'express';
import { diskStorage } from 'multer';
import appConfig from 'src/config/app.config';

@ApiBearerAuth()
@ApiTags('Package')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/package')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @ApiOperation({ summary: 'Create package' })
  @Post()
  @UseInterceptors(
    FilesInterceptor('package_images', 10, {
      storage: diskStorage({
        destination:
          appConfig().storageUrl.rootUrl + '/' + appConfig().storageUrl.package,
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
    @Req() req: Request,
    @Body() createPackageDto: CreatePackageDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB
          // support all image types
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
        fileIsRequired: false,
      }),
    )
    package_images?: Express.Multer.File[],
  ) {
    try {
      const user_id = req.user.userId;

      // return package_images.map(file => ({
      //   originalName: file.originalname,
      //   filename: file.filename,
      //   path: `/public/storage/${file.filename}`,
      //   size: file.size,
      // }));

      const record = await this.packageService.create(
        user_id,
        createPackageDto,
        package_images,
      );
      return record;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get()
  findAll() {
    return this.packageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packageService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePackageDto: UpdatePackageDto) {
    return this.packageService.update(+id, updatePackageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.packageService.remove(+id);
  }
}
